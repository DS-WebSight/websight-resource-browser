package pl.ds.websight.resourcebrowser.rest;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import pl.ds.websight.request.parameters.support.annotations.RequestParameter;

import javax.validation.constraints.NotEmpty;
import java.util.List;

@Model(adaptables = SlingHttpServletRequest.class)
public class ProvidersBaseRestModel {

    @SlingObject
    private ResourceResolver resourceResolver;

    @RequestParameter
    @NotEmpty(message = "Providers cannot be empty")
    private List<String> providers;

    public ResourceResolver getResourceResolver() {
        return resourceResolver;
    }

    public List<String> getProviders() {
        return providers;
    }

}
