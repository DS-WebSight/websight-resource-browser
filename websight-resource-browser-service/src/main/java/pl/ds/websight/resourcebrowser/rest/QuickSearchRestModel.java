package pl.ds.websight.resourcebrowser.rest;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.models.annotations.Model;
import pl.ds.websight.request.parameters.support.annotations.RequestParameter;

import javax.validation.constraints.NotNull;

@Model(adaptables = SlingHttpServletRequest.class)
public class QuickSearchRestModel extends ProvidersBaseRestModel {

    @NotNull
    @RequestParameter
    private String phrase;

    public String getPhrase() {
        return phrase;
    }

}
