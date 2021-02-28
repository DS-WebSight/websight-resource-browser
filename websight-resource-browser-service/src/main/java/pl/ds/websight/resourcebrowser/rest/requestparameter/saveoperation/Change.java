package pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation;

import java.util.List;

public class Change {

    private String provider;

    private List<String> copyResource;
    private List<CreateResourceOperation> createResource;
    private MoveResourceOperation moveResource;
    private List<String> removeResource;

    private List<SetPropertyOperation> setProperty;
    private List<String> removeProperty;

    public List<String> getCopyResource() {
        return copyResource;
    }

    public List<CreateResourceOperation> getCreateResource() {
        return createResource;
    }

    public MoveResourceOperation getMoveResource() {
        return moveResource;
    }

    public List<String> getRemoveResource() {
        return removeResource;
    }

    public String getProvider() {
        return provider;
    }

    public List<SetPropertyOperation> getSetProperty() {
        return setProperty;
    }

    public List<String> getRemoveProperty() {
        return removeProperty;
    }

}
