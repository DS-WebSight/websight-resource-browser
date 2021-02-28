package pl.ds.websight.resourcebrowser.service;

import org.apache.sling.api.resource.ResourceResolver;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProviderInfo;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProvidersControl;

import java.util.List;

public interface ResourceBrowserService {

    ResourceProvidersControl getResourceProvidersControl(List<String> providerNames, ResourceResolver resourceResolver);

    List<ResourceProviderInfo> listAvailableProviders();

}
