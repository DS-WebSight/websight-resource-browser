package pl.ds.websight.resourcebrowser.service.impl;

import pl.ds.websight.system.user.provider.service.SystemUserConfig;

import javax.jcr.security.Privilege;
import java.util.HashMap;
import java.util.Map;

public class IndexReaderSystemUserConfig implements SystemUserConfig {

    private static final Map<String, String[]> privileges = new HashMap<>();

    static {
        privileges.put("/oak:index", new String[] { Privilege.JCR_READ });
    }

    @Override
    public String getSystemUserId() {
        return "websight-index-reader";
    }

    @Override
    public Map<String, String[]> getPrivileges() {
        return privileges;
    }

}
