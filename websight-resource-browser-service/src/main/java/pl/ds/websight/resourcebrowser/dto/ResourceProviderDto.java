package pl.ds.websight.resourcebrowser.dto;

public class ResourceProviderDto {

    private String name;
    private boolean modifiable;

    public ResourceProviderDto(String name, boolean modifiable) {
        this.name = name;
        this.modifiable = modifiable;
    }

    public String getName() {
        return name;
    }

    public boolean isModifiable() {
        return modifiable;
    }

}
