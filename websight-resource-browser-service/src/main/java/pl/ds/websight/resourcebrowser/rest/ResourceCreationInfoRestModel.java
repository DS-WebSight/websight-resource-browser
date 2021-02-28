package pl.ds.websight.resourcebrowser.rest;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import pl.ds.websight.request.parameters.support.annotations.RequestParameter;

@Model(adaptables = SlingHttpServletRequest.class)
public class ResourceCreationInfoRestModel {

    @SlingObject
    private ResourceResolver resourceResolver;

    @RequestParameter
    private String parentPath;

    @RequestParameter
    private String parentType;

    public String getParentPath() {
        return parentPath;
    }

    public String getParentType() {
        return parentType;
    }

    public ResourceResolver getResourceResolver() {
        return resourceResolver;
    }

}
