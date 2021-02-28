package pl.ds.websight.resourcebrowser.dto;

import java.util.Map;

public class ResourceCreationInfoDto {

    private final Map<String, Object> detailedInfo;

    public ResourceCreationInfoDto(Map<String, Object> detailedInfo) {
        this.detailedInfo = detailedInfo;
    }

    public Map<String, Object> getDetailedInfo() {
        return detailedInfo;
    }

}
