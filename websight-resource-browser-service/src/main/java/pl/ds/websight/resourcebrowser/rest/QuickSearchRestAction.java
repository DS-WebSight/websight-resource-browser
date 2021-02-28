package pl.ds.websight.resourcebrowser.rest;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.api.QuickSearchResults;
import pl.ds.websight.resourcebrowser.api.QuickSearchService;
import pl.ds.websight.resourcebrowser.dto.QuickSearchDto;
import pl.ds.websight.resourcebrowser.dto.ResourceListDto;
import pl.ds.websight.resourcebrowser.resourceprovider.AuthenticatedResourceProvider;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProvidersControl;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceWrapper;
import pl.ds.websight.resourcebrowser.service.ResourceBrowserService;
import pl.ds.websight.resourcebrowser.service.impl.ResourceContentService;
import pl.ds.websight.resourcebrowser.util.ResourceBrowserUtil;
import pl.ds.websight.rest.framework.RestAction;
import pl.ds.websight.rest.framework.RestActionResult;
import pl.ds.websight.rest.framework.annotations.SlingAction;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static java.util.Comparator.comparing;
import static java.util.stream.Collectors.toList;
import static pl.ds.websight.rest.framework.annotations.SlingAction.HttpMethod.GET;

@Component
@SlingAction(GET)
public class QuickSearchRestAction extends AbstractRestAction<QuickSearchRestModel, QuickSearchDto>
        implements RestAction<QuickSearchRestModel, QuickSearchDto> {

    private static final Logger LOG = LoggerFactory.getLogger(QuickSearchRestAction.class);

    private static final int RESULT_LIMIT = 20;

    private final Map<String, QuickSearchService> quickSearchServices = new HashMap<>();

    @Reference
    private ResourceBrowserService resourceBrowserService;

    @Reference
    private ResourceContentService resourceContentService;

    @Override
    protected RestActionResult<QuickSearchDto> performAction(QuickSearchRestModel model) {
        ResourceResolver resourceResolver = model.getResourceResolver();
        String phrase = model.getPhrase();

        Map<String, Object> quickSearchResponse = new HashMap<>();
        Map<String, ResourceListDto> resources = new HashMap<>();
        for (String providerName : model.getProviders()) {
            if (quickSearchServices.containsKey(providerName)) {
                QuickSearchResults searchResults = quickSearchServices.get(providerName).search(resourceResolver, phrase);
                for (String resourcePath : searchResults.getPaths()) {
                    includeResource(resources, resourceResolver, resourcePath, providerName);
                }
                if (!searchResults.getData().isEmpty()) {
                    quickSearchResponse.put(providerName, searchResults.getData());
                }
            }
            if (resources.size() >= RESULT_LIMIT) {
                break;
            }
        }
        return RestActionResult.success(new QuickSearchDto(getResourcesList(resources), quickSearchResponse));
    }

    private void includeResource(Map<String, ResourceListDto> resources, ResourceResolver resourceResolver, String path, String provider) {
        Resource foundResource = resourceResolver.getResource(path);
        if (foundResource != null) {
            List<String> providers = new ArrayList<>();
            providers.add(provider);
            if (resources.containsKey(path)) {
                providers.addAll(resources.get(path).getProviders());
            }
            Map.Entry<AuthenticatedResourceProvider, Resource> primaryVariant =
                    getResourcePrimaryVariant(resourceResolver, path, providers);
            boolean hasContent = resourceContentService.hasContent(primaryVariant);
            resources.put(path, new ResourceListDto(foundResource, providers, hasContent));
        }
    }

    private Map.Entry<AuthenticatedResourceProvider, Resource> getResourcePrimaryVariant(ResourceResolver resourceResolver, String path,
            List<String> providers) {
        ResourceProvidersControl resourceProvidersControl = resourceBrowserService.getResourceProvidersControl(providers, resourceResolver);
        ResourceWrapper providedResource = resourceProvidersControl.getResource(resourceResolver, path);
        return providedResource.getPrimaryVariant();
    }

    private static List<ResourceListDto> getResourcesList(Map<String, ResourceListDto> resources) {
        return resources.values().stream()
                .sorted(comparing(ResourceListDto::getPath))
                .collect(toList());
    }

    @Reference(service = QuickSearchService.class, cardinality = ReferenceCardinality.MULTIPLE, policy = ReferencePolicy.DYNAMIC)
    protected synchronized void bindQuickSearchService(QuickSearchService quickSearchService, Map<String, Object> properties) {
        String provider = (String) properties.get(ResourceBrowserUtil.SERVICE_PROPERTY_PROVIDER);
        if (StringUtils.isNotBlank(provider)) {
            LOG.error("Binding {}", quickSearchService);
            quickSearchServices.put(provider, quickSearchService);
        }
    }

    protected synchronized void unbindQuickSearchService(QuickSearchService quickSearchService, Map<String, Object> properties) {
        String provider = (String) properties.get(ResourceBrowserUtil.SERVICE_PROPERTY_PROVIDER);
        if (StringUtils.isNotBlank(provider)) {
            LOG.error("Unbinding {}", quickSearchService);
            quickSearchServices.remove(provider, quickSearchService);
        }
    }

    @Override
    protected String getUnexpectedErrorMessage() {
        return Messages.QUICK_SEARCH_ERROR;
    }

}
