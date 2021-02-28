package pl.ds.websight.resourcebrowser.rest;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.api.ResourceCreationInfoService;
import pl.ds.websight.resourcebrowser.dto.ResourceCreationInfoDto;
import pl.ds.websight.resourcebrowser.service.ResourceBrowserService;
import pl.ds.websight.resourcebrowser.util.ResourceBrowserUtil;
import pl.ds.websight.rest.framework.RestAction;
import pl.ds.websight.rest.framework.RestActionResult;
import pl.ds.websight.rest.framework.annotations.SlingAction;

import java.util.HashMap;
import java.util.Map;

import static pl.ds.websight.rest.framework.annotations.SlingAction.HttpMethod.GET;

@Component
@SlingAction(GET)
public class ResourceCreationInfoRestAction extends AbstractRestAction<ResourceCreationInfoRestModel, ResourceCreationInfoDto>
        implements RestAction<ResourceCreationInfoRestModel, ResourceCreationInfoDto> {

    private static final Logger LOG = LoggerFactory.getLogger(ResourceCreationInfoRestAction.class);

    private final Map<String, ResourceCreationInfoService<?>> creationInfoServices = new HashMap<>();

    @Reference
    private ResourceBrowserService resourceBrowserService;

    @Override
    protected RestActionResult<ResourceCreationInfoDto> performAction(ResourceCreationInfoRestModel model) {
        ResourceResolver resourceResolver = model.getResourceResolver();
        String path = model.getParentPath();
        String type = model.getParentType();

        Map<String, Object> providerSpecificInfo = new HashMap<>();
        creationInfoServices.forEach((key, value) -> providerSpecificInfo.put(key, value.getInfo(resourceResolver, path, type)));
        return RestActionResult.success(new ResourceCreationInfoDto(providerSpecificInfo));
    }

    @Reference(service = ResourceCreationInfoService.class, cardinality = ReferenceCardinality.MULTIPLE, policy = ReferencePolicy.DYNAMIC)
    protected synchronized void bindCreationInfoServices(ResourceCreationInfoService<?> infoService, Map<String, Object> properties) {
        String handledProvider = (String) properties.get(ResourceBrowserUtil.SERVICE_PROPERTY_PROVIDER);
        if (StringUtils.isNotBlank(handledProvider)) {
            LOG.error("Binding {}", infoService.getClass().getName());
            creationInfoServices.put(handledProvider, infoService);
        }
    }

    protected synchronized void unbindCreationInfoServices(ResourceCreationInfoService<?> infoService, Map<String, Object> properties) {
        String handledProvider = (String) properties.get(ResourceBrowserUtil.SERVICE_PROPERTY_PROVIDER);
        if (StringUtils.isNotBlank(handledProvider)) {
            LOG.error("Unbinding {}", infoService.getClass().getName());
            creationInfoServices.remove(handledProvider, infoService);
        }
    }

    @Override
    protected String getUnexpectedErrorMessage() {
        return Messages.NODE_CREATION_INFO_ERROR;
    }

}
