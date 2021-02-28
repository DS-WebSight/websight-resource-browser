package pl.ds.websight.resourcebrowser.rest;

import org.apache.commons.io.IOUtils;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.resourceprovider.AuthenticatedResourceProvider;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProvidersControl;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceWrapper;
import pl.ds.websight.resourcebrowser.service.ResourceBrowserService;
import pl.ds.websight.resourcebrowser.service.impl.ResourceContentService;
import pl.ds.websight.rest.framework.FreeFormResponse;
import pl.ds.websight.rest.framework.RestAction;
import pl.ds.websight.rest.framework.RestActionResult;
import pl.ds.websight.rest.framework.annotations.SlingAction;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

import static javax.servlet.http.HttpServletResponse.SC_NOT_FOUND;
import static pl.ds.websight.rest.framework.annotations.SlingAction.HttpMethod.GET;

@Component
@SlingAction(GET)
public class GetResourceContentRestAction extends AbstractRestAction<ProvidedResourceRestModel, FreeFormResponse>
        implements RestAction<ProvidedResourceRestModel, FreeFormResponse> {

    private static final Logger LOG = LoggerFactory.getLogger(GetResourceContentRestAction.class);

    @Reference
    private ResourceBrowserService resourceBrowserService;

    @Reference
    private ResourceContentService resourceContentService;

    @Override
    protected RestActionResult<FreeFormResponse> performAction(ProvidedResourceRestModel model) {
        return RestActionResult.freeFormResponse(response -> {
            Map.Entry<AuthenticatedResourceProvider, Resource> primaryVariant = getPrimaryVariant(model);
            if (primaryVariant == null) {
                LOG.warn("Could not find resource '{}' within requested providers", model.getPath());
                response.sendError(SC_NOT_FOUND);
                return;
            }
            // Don't cache the results
            response.setHeader("Cache-Control", "no-store");
            try (InputStream contentStream = resourceContentService.getContent(primaryVariant)) {
                if (contentStream == null) {
                    LOG.warn("Could not get content for resource '{}' within requested providers", model.getPath());
                    response.sendError(SC_NOT_FOUND);
                    return;
                }
                response.setContentType(resourceContentService.getMimeType(primaryVariant));
                IOUtils.copy(contentStream, response.getOutputStream());
            }
        });
    }

    private Map.Entry<AuthenticatedResourceProvider, Resource> getPrimaryVariant(ProvidedResourceRestModel model) {
        ResourceResolver resourceResolver = model.getResourceResolver();
        String path = model.getPath();
        List<String> providers = model.getProviders();
        ResourceProvidersControl providersControl = resourceBrowserService.getResourceProvidersControl(providers, resourceResolver);
        ResourceWrapper providedResource = providersControl.getResource(resourceResolver, path);
        if (providedResource == null) {
            LOG.warn("Could not find resource '{}'", path);
            return null;
        }
        return providedResource.getPrimaryVariant();
    }

    @Override
    protected String getUnexpectedErrorMessage() {
        return Messages.GET_RESOURCE_CONTENT_ERROR;
    }

}
