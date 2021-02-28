package pl.ds.websight.resourcebrowser.rest;

import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.api.AbstractPropertyDto;
import pl.ds.websight.resourcebrowser.api.SaveOperationProcessor;
import pl.ds.websight.resourcebrowser.resourceprovider.AuthenticatedResourceProvider;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProviderInfo;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProvidersControl;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceWrapper;
import pl.ds.websight.resourcebrowser.rest.processor.impl.SaveOperationProcessors;
import pl.ds.websight.resourcebrowser.service.ResourceBrowserService;
import pl.ds.websight.rest.framework.RestAction;
import pl.ds.websight.rest.framework.RestActionResult;
import pl.ds.websight.rest.framework.annotations.SlingAction;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static pl.ds.websight.rest.framework.annotations.SlingAction.HttpMethod.GET;

@Component
@SlingAction(GET)
public class GetPropertiesRestAction extends AbstractRestAction<ProvidedResourceRestModel, Map<String, List<AbstractPropertyDto>>>
        implements RestAction<ProvidedResourceRestModel, Map<String, List<AbstractPropertyDto>>> {

    private static final Logger LOG = LoggerFactory.getLogger(GetPropertiesRestAction.class);

    @Reference
    private ResourceBrowserService resourceBrowserService;

    @Reference
    private SaveOperationProcessors saveOperationProcessors;

    @Override
    protected RestActionResult<Map<String, List<AbstractPropertyDto>>> performAction(ProvidedResourceRestModel model) {
        ResourceResolver resourceResolver = model.getResourceResolver();
        String path = model.getPath();
        ResourceProvidersControl providersControl = resourceBrowserService.getResourceProvidersControl(model.getProviders(),
                resourceResolver);
        ResourceWrapper providedResource = providersControl.getResource(resourceResolver, path);
        if (providedResource == null) {
            LOG.warn("Could not find resource '{}'", path);
            return RestActionResult.failure(Messages.GET_PROPERTIES_ERROR,
                    Messages.formatMessage(Messages.GET_PROPERTIES_ERROR_DETAILS, path));
        }
        return RestActionResult.success(createPropertiesMap(providedResource));
    }

    private Map<String, List<AbstractPropertyDto>> createPropertiesMap(ResourceWrapper providedResource) {
        Map<String, List<AbstractPropertyDto>> properties = new HashMap<>();
        for (Map.Entry<AuthenticatedResourceProvider, Resource> variant : providedResource.getVariants().entrySet()) {
            ResourceProviderInfo providerInfo = variant.getKey().getInfo();
            SaveOperationProcessor processor = saveOperationProcessors.getProcessor(variant);
            properties.put(providerInfo.getName(), processor.getProperties(variant.getValue()));
        }
        return properties;
    }

    @Override
    protected String getUnexpectedErrorMessage() {
        return Messages.GET_PROPERTIES_ERROR;
    }

}
