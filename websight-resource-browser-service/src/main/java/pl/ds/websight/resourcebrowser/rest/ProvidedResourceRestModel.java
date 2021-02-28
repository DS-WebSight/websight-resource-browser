package pl.ds.websight.resourcebrowser.rest;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.models.annotations.Model;
import pl.ds.websight.request.parameters.support.annotations.RequestParameter;

import javax.validation.constraints.NotBlank;

@Model(adaptables = SlingHttpServletRequest.class)
public class ProvidedResourceRestModel extends ProvidersBaseRestModel {

    @RequestParameter
    @NotBlank(message = "Path cannot be blank")
    private String path;

    public String getPath() {
        return path;
    }

}
