package pl.ds.websight.resourcebrowser.dto;

public class ResourceContentDataDto {

    private final String mimeType;
    private final String provider;
    private final String sourcePath;
    private final boolean readOnly;

    public ResourceContentDataDto(String mimeType, String provider, String sourcePath, boolean readOnly) {
        this.mimeType = mimeType;
        this.provider = provider;
        this.sourcePath = sourcePath;
        this.readOnly = readOnly;
    }

    public String getMimeType() {
        return mimeType;
    }

    public String getProvider() {
        return provider;
    }

    public String getSourcePath() {
        return sourcePath;
    }

    public boolean isReadOnly() {
        return readOnly;
    }

}
