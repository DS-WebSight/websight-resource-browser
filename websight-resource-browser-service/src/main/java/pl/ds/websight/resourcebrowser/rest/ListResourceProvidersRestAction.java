package pl.ds.websight.resourcebrowser.rest;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import pl.ds.websight.resourcebrowser.dto.ResourceProviderDto;
import pl.ds.websight.resourcebrowser.service.ResourceBrowserService;
import pl.ds.websight.rest.framework.RestAction;
import pl.ds.websight.rest.framework.RestActionResult;
import pl.ds.websight.rest.framework.annotations.SlingAction;

import java.util.List;

import static java.util.stream.Collectors.toList;
import static pl.ds.websight.rest.framework.annotations.SlingAction.HttpMethod.GET;

@Component
@SlingAction(GET)
public class ListResourceProvidersRestAction extends AbstractRestAction<ListResourceProvidersRestModel, List<ResourceProviderDto>>
        implements RestAction<ListResourceProvidersRestModel, List<ResourceProviderDto>> {

    @Reference
    private ResourceBrowserService resourceBrowserService;

    @Override
    protected RestActionResult<List<ResourceProviderDto>> performAction(ListResourceProvidersRestModel model) {
        List<ResourceProviderDto> availableProviders = resourceBrowserService.listAvailableProviders().stream()
                .map(providerInfo -> new ResourceProviderDto(providerInfo.getName(), providerInfo.isModifiable()))
                .distinct()
                .collect(toList());
        return RestActionResult.success(availableProviders);
    }

    @Override
    protected String getUnexpectedErrorMessage() {
        return Messages.LIST_RESOURCE_PROVIDERS_ERROR;
    }

}
