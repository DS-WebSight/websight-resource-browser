package pl.ds.websight.resourcebrowser.api;

import org.apache.sling.api.resource.ResourceResolver;

public interface QuickSearchService {

    QuickSearchResults search(ResourceResolver resourceResolver, String phrase);

}
