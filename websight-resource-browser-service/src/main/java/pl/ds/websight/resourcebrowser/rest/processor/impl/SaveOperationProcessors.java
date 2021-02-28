package pl.ds.websight.resourcebrowser.rest.processor.impl;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.Resource;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.api.SaveOperationProcessor;
import pl.ds.websight.resourcebrowser.resourceprovider.AuthenticatedResourceProvider;
import pl.ds.websight.resourcebrowser.util.ResourceBrowserUtil;

import java.util.HashMap;
import java.util.Map;

@Component(service = SaveOperationProcessors.class)
public class SaveOperationProcessors {

    private static final Logger LOG = LoggerFactory.getLogger(SaveOperationProcessors.class);

    private final Map<String, SaveOperationProcessor> actionProcessors = new HashMap<>();

    public SaveOperationProcessor getProcessor(Map.Entry<AuthenticatedResourceProvider, Resource> variant) {
        AuthenticatedResourceProvider provider = variant.getKey();
        return actionProcessors.getOrDefault(provider.getInfo().getName(), new DefaultSaveOperationProcessor(provider));
    }

    @Reference(service = SaveOperationProcessor.class, cardinality = ReferenceCardinality.MULTIPLE, policy = ReferencePolicy.DYNAMIC)
    protected synchronized void bindActionProcessors(SaveOperationProcessor processor, Map<String, Object> properties) {
        String handledProvider = (String) properties.get(ResourceBrowserUtil.SERVICE_PROPERTY_PROVIDER);
        if (StringUtils.isNotBlank(handledProvider)) {
            LOG.error("Binding {}", processor.getClass().getName());
            actionProcessors.put(handledProvider, processor);
        }
    }

    protected synchronized void unbindActionProcessors(SaveOperationProcessor processor, Map<String, Object> properties) {
        String handledProvider = (String) properties.get(ResourceBrowserUtil.SERVICE_PROPERTY_PROVIDER);
        if (StringUtils.isNotBlank(handledProvider)) {
            LOG.error("Unbinding {}", processor.getClass().getName());
            actionProcessors.remove(handledProvider, processor);
        }
    }

}
