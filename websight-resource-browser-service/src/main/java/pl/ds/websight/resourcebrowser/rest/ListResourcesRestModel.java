package pl.ds.websight.resourcebrowser.rest;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.models.annotations.Model;
import pl.ds.websight.request.parameters.support.annotations.RequestParameter;

import javax.validation.constraints.NotEmpty;
import java.util.List;

@Model(adaptables = SlingHttpServletRequest.class)
public class ListResourcesRestModel extends ProvidersBaseRestModel {

    @RequestParameter
    @NotEmpty(message = "Paths cannot be empty")
    private List<String> paths;

    public List<String> getPaths() {
        return paths;
    }

}
