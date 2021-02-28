package pl.ds.websight.resourcebrowser.rest;

import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.dto.ResourceContentDataDto;
import pl.ds.websight.resourcebrowser.resourceprovider.AuthenticatedResourceProvider;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProviderInfo;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProvidersControl;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceWrapper;
import pl.ds.websight.resourcebrowser.service.ResourceBrowserService;
import pl.ds.websight.resourcebrowser.service.impl.ResourceContentService;
import pl.ds.websight.rest.framework.RestAction;
import pl.ds.websight.rest.framework.RestActionResult;
import pl.ds.websight.rest.framework.annotations.SlingAction;

import java.util.Map;

import static pl.ds.websight.rest.framework.annotations.SlingAction.HttpMethod.GET;

@Component
@SlingAction(GET)
public class GetResourceContentDataRestAction extends AbstractRestAction<ProvidedResourceRestModel, ResourceContentDataDto>
        implements RestAction<ProvidedResourceRestModel, ResourceContentDataDto> {

    private static final Logger LOG = LoggerFactory.getLogger(GetResourceContentDataRestAction.class);

    @Reference
    private ResourceBrowserService resourceBrowserService;

    @Reference
    private ResourceContentService resourceContentService;

    @Override
    protected RestActionResult<ResourceContentDataDto> performAction(ProvidedResourceRestModel model) {
        String path = model.getPath();
        ResourceResolver resourceResolver = model.getResourceResolver();
        ResourceProvidersControl providersControl = resourceBrowserService.getResourceProvidersControl(model.getProviders(),
                resourceResolver);
        ResourceWrapper providedResource = providersControl.getResource(resourceResolver, path);
        if (providedResource == null) {
            LOG.warn("Could not find resource '{}'", path);
            return RestActionResult.failure(
                    Messages.GET_RESOURCE_CONTENT_ERROR_NOT_EXISTS,
                    Messages.formatMessage(Messages.GET_RESOURCE_CONTENT_ERROR_NOT_EXISTS_DETAILS, path));
        }
        Map.Entry<AuthenticatedResourceProvider, Resource> primaryVariant = providedResource.getPrimaryVariant();
        if (primaryVariant == null) {
            LOG.warn("Could not find resource '{}' within requested providers", path);
            return RestActionResult.failure(
                    Messages.GET_RESOURCE_CONTENT_ERROR_NOT_PROVIDED,
                    Messages.formatMessage(Messages.GET_RESOURCE_CONTENT_ERROR_NOT_PROVIDED_DETAILS, path));
        }
        if (!resourceContentService.hasContent(primaryVariant)) {
            return RestActionResult.failure(
                    Messages.GET_RESOURCE_CONTENT_ERROR,
                    Messages.formatMessage(Messages.GET_RESOURCE_CONTENT_ERROR_DETAILS, path));
        }
        String mimeType = resourceContentService.getMimeType(primaryVariant);
        String sourcePath = resourceContentService.getSourcePath(primaryVariant);
        ResourceProviderInfo providerInfo = primaryVariant.getKey().getInfo();
        return RestActionResult.success(
                new ResourceContentDataDto(mimeType, providerInfo.getName(), sourcePath, !providerInfo.isModifiable()));
    }

    @Override
    protected String getUnexpectedErrorMessage() {
        return Messages.GET_RESOURCE_CONTENT_ERROR;
    }

}
