package pl.ds.websight.resourcebrowser.api;

public abstract class AbstractPropertyDto {

    protected static final String BINARY_PLACEHOLDER = "[binary value]";

    protected String name;
    protected String type;
    protected Object value;

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public Object getValue() {
        return value;
    }

}
