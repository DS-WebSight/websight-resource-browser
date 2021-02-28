package pl.ds.websight.resourcebrowser.api;

import java.util.List;
import java.util.Map;

public class QuickSearchResults {

    private final List<String> paths;
    private final Map<String, Object> data;

    public QuickSearchResults(List<String> paths, Map<String, Object> data) {
        this.paths = paths;
        this.data = data;
    }

    public List<String> getPaths() {
        return paths;
    }

    public Map<String, Object> getData() {
        return data;
    }

}
