package pl.ds.websight.resourcebrowser.rest;

import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import pl.ds.websight.resourcebrowser.dto.ResourceListDto;
import pl.ds.websight.resourcebrowser.resourceprovider.AuthenticatedResourceProvider;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProvidersControl;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceWrapper;
import pl.ds.websight.resourcebrowser.service.ResourceBrowserService;
import pl.ds.websight.resourcebrowser.service.impl.ResourceContentService;
import pl.ds.websight.rest.framework.RestAction;
import pl.ds.websight.rest.framework.RestActionResult;
import pl.ds.websight.rest.framework.annotations.SlingAction;

import java.util.LinkedList;
import java.util.List;
import java.util.Objects;

import static java.util.stream.Collectors.toList;
import static pl.ds.websight.rest.framework.annotations.SlingAction.HttpMethod.GET;

@Component
@SlingAction(GET)
public class ListResourcesRestAction extends AbstractRestAction<ListResourcesRestModel, List<ResourceListDto>>
        implements RestAction<ListResourcesRestModel, List<ResourceListDto>> {

    @Reference
    private ResourceBrowserService resourceBrowserService;

    @Reference
    private ResourceContentService resourceContentService;

    @Override
    protected RestActionResult<List<ResourceListDto>> performAction(ListResourcesRestModel model) {
        ResourceResolver resourceResolver = model.getResourceResolver();
        ResourceProvidersControl providersControl = resourceBrowserService.getResourceProvidersControl(model.getProviders(),
                resourceResolver);
        List<ResourceListDto> resources = new LinkedList<>();
        for (ResourceWrapper parentProvidedResource : getRootResources(providersControl, resourceResolver, model.getPaths())) {
            ResourceListDto resourceListDto = createListResourcesItem(parentProvidedResource, resourceResolver, providersControl);
            providersControl.listChildren(parentProvidedResource).stream()
                    .map(providedResource -> createListResourcesItem(providedResource, resourceResolver, providersControl))
                    .forEachOrdered(resourceListDto::addChild);
            resources.add(resourceListDto);
        }
        return RestActionResult.success(resources);
    }

    private List<ResourceWrapper> getRootResources(ResourceProvidersControl providersControl, ResourceResolver resourceResolver,
            List<String> paths) {
        return paths.stream()
                .map(path -> providersControl.getResource(resourceResolver, path))
                .filter(Objects::nonNull)
                .collect(toList());
    }

    private ResourceListDto createListResourcesItem(ResourceWrapper providedResource, ResourceResolver resourceResolver,
            ResourceProvidersControl providersControl) {
        boolean hasChildren = providersControl.hasChildren(providedResource);
        String shadowedBy = null;
        String resourcePath = providedResource.getPath();
        if (resourceResolver.getResource(resourcePath) == null) {
            AuthenticatedResourceProvider bestMatchingProvider = providersControl.getBestMatchingProvider(resourcePath);
            if (bestMatchingProvider != null) {
                shadowedBy = bestMatchingProvider.getInfo().getName();
            }
        }
        boolean hasContent = resourceContentService.hasContent(providedResource.getPrimaryVariant());
        boolean orderable = !ResourceProvidersControl.shouldSort(providedResource);
        return new ResourceListDto(providedResource, shadowedBy, hasContent, hasChildren, orderable);
    }

    @Override
    protected String getUnexpectedErrorMessage() {
        return Messages.LIST_RESOURCES_ERROR;
    }

}
