package pl.ds.websight.resourcebrowser.auth;

import org.osgi.service.component.annotations.Component;
import pl.ds.websight.admin.auth.AnonymousAccessEnabler;

@Component(service = AnonymousAccessEnabler.class)
public class ResourceBrowserAnonymousAccessEnabler implements AnonymousAccessEnabler {

    @Override
    public String[] getPaths() {
        return new String[] { "/apps/websight-resource-browser-service" };
    }
}