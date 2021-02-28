package pl.ds.websight.resourcebrowser.rest;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.request.parameters.support.annotations.RequestParameter;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.Change;

import javax.annotation.PostConstruct;
import javax.jcr.Session;
import javax.validation.constraints.NotBlank;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Model(adaptables = SlingHttpServletRequest.class)
public class SaveChangesRestModel {

    private static final Logger LOG = LoggerFactory.getLogger(SaveChangesRestModel.class);
    private static final TypeReference<Map<String, List<Change>>> CHANGELOG_TYPE_REF = new TypeReference<Map<String, List<Change>>>() {};
    private static final ObjectReader OBJECT_READER = new ObjectMapper().readerFor(CHANGELOG_TYPE_REF);

    @SlingObject
    private ResourceResolver resourceResolver;

    @RequestParameter
    @NotBlank(message = "Changelog cannot be blank")
    private String changelog;

    private Map<String, List<Change>> changesPerPath;

    @PostConstruct
    private void init() {
        try {
            changesPerPath = StringUtils.isNotBlank(changelog) ? OBJECT_READER.readValue(changelog) : Collections.emptyMap();
        } catch (IOException e) {
            LOG.warn("Could not parse changelog parameter {}", changelog, e);
        }
    }

    public Map<String, List<Change>> getChangelog() {
        return changesPerPath;
    }

    public String getChangelogString() {
        return changelog;
    }

    public ResourceResolver getResourceResolver() {
        return resourceResolver;
    }

    public Session getSession() {
        return resourceResolver.adaptTo(Session.class);
    }

}
