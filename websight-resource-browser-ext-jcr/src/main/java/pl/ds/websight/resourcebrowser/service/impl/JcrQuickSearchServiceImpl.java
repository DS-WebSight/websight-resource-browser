package pl.ds.websight.resourcebrowser.service.impl;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.LoginException;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.api.QuickSearchResults;
import pl.ds.websight.resourcebrowser.api.QuickSearchService;
import pl.ds.websight.resourcebrowser.util.JcrUtil;
import pl.ds.websight.system.user.provider.service.SystemUserProvider;

import javax.jcr.Node;
import javax.jcr.RepositoryException;
import javax.jcr.Session;
import javax.jcr.Workspace;
import javax.jcr.query.Query;
import javax.jcr.query.QueryManager;
import javax.jcr.query.QueryResult;
import javax.jcr.query.RowIterator;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component(service = QuickSearchService.class, property={"provider=" + JcrUtil.JCR_PROVIDER})
public class JcrQuickSearchServiceImpl implements QuickSearchService {

    private static final Logger LOG = LoggerFactory.getLogger(JcrQuickSearchServiceImpl.class);

    private static final String INDEX_REFERENCE = "wsBasePathLucene";
    private static final String INDEX_REFERENCE_FALLBACK = "lucene";
    private static final String REINDEX_PROPERTY_NAME = "reindex";
    private static final String QUERY_PATTERN = "select [jcr:path] from [nt:base] where native('%s', '\\:path:\\/*%s*')";
    private static final String WARNING_MESSAGE = "Indexing node paths, results may be incomplete...";
    private static final String WS_INDEX_PATH= "/oak:index/" + INDEX_REFERENCE;

    private static final int RESULT_LIMIT = 20;

    @Reference
    private ResourceResolverFactory resourceResolverFactory;

    @Reference
    private SystemUserProvider systemUserProvider;

    @Override
    public QuickSearchResults search(ResourceResolver resourceResolver, String phrase) {
        String indexReference = null;
        List<String> resourcePaths = new ArrayList<>();
        if (StringUtils.isNotBlank(phrase)) {
            try {
                Session session = resourceResolver.adaptTo(Session.class);
                QueryManager queryManager = getQueryManager(session);
                if (queryManager != null) {
                    indexReference = getIndexReference();
                    String queryString = String.format(QUERY_PATTERN, indexReference, sanitizePhrase(phrase));

                    RowIterator rows = executeQuery(queryManager, queryString);
                    while (rows.hasNext()) {
                        resourcePaths.add(rows.nextRow().getPath());
                    }
                }
            } catch (RepositoryException e) {
                LOG.warn("Could not find resources", e);
            }
        }
        return createResults(resourcePaths, indexReference);
    }

    private static QueryManager getQueryManager(Session session) throws RepositoryException {
        if (session != null) {
            Workspace workspace = session.getWorkspace();
            if (workspace != null){
                return workspace.getQueryManager();
            }
        }
        return null;
    }

    private String getIndexReference() throws RepositoryException {
        try (ResourceResolver resourceResolver = systemUserProvider.getSystemUserResourceResolver(resourceResolverFactory,
                new IndexReaderSystemUserConfig())) {
            Session session = resourceResolver.adaptTo(Session.class);
            if (session != null && session.nodeExists(WS_INDEX_PATH)) {
                Node wsIndexNode = session.getNode(WS_INDEX_PATH);
                if (wsIndexNode.hasProperty(REINDEX_PROPERTY_NAME)) {
                    boolean isIndexing = wsIndexNode.getProperty(REINDEX_PROPERTY_NAME).getBoolean();
                    if (!isIndexing) {
                        return INDEX_REFERENCE;
                    }
                }
            }
        } catch (LoginException e) {
            LOG.warn("Failed to read {} index", INDEX_REFERENCE, e);
        }
        return INDEX_REFERENCE_FALLBACK;
    }

    private String sanitizePhrase(String phrase) {
        phrase = StringUtils.removeStart(phrase, "/"); // Added in QUERY_PATTERN
        String escapedPhrase = JcrUtil.escape(phrase).replace(" ", "*");
        return escapedPhrase.replaceAll("\\\\/", "*\\\\/*");
    }

    private RowIterator executeQuery(QueryManager queryManager, String queryString) throws RepositoryException {
        Query query = queryManager.createQuery(queryString, Query.JCR_SQL2);
        query.setLimit(RESULT_LIMIT);
        QueryResult queryResult = query.execute();
        return queryResult.getRows();
    }

    private QuickSearchResults createResults(List<String> paths, String usedIndex) {
        Map<String, Object> data = new HashMap<>();
        if (StringUtils.equals(usedIndex, INDEX_REFERENCE_FALLBACK)) {
            data.put("warning", WARNING_MESSAGE);
        }
        return new QuickSearchResults(paths, data);
    }

}
