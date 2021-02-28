package pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation;

import java.util.List;

public class CreateResourceOperation {

    private String name;
    private String type;
    private List<SetPropertyOperation> properties;
    private List<CreateResourceOperation> children;

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public List<SetPropertyOperation> getProperties() {
        return properties;
    }

    public List<CreateResourceOperation> getChildren() {
        return children;
    }

}
