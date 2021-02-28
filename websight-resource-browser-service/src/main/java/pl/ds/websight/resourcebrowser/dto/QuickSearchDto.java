package pl.ds.websight.resourcebrowser.dto;

import java.util.List;
import java.util.Map;

public class QuickSearchDto {

    private final List<ResourceListDto> results;
    private final Map<String, Object> data;

    public QuickSearchDto(List<ResourceListDto> results, Map<String, Object> data) {
        this.results = results;
        this.data = data;
    }

    public List<ResourceListDto> getResults() {
        return results;
    }

    public Map<String, Object> getData() {
        return data;
    }

}
