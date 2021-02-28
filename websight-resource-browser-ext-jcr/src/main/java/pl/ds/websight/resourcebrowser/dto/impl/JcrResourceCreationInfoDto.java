package pl.ds.websight.resourcebrowser.dto.impl;

import org.apache.commons.lang3.StringUtils;

import javax.jcr.PropertyType;
import javax.jcr.nodetype.PropertyDefinition;
import java.util.List;
import java.util.Map;

public class JcrResourceCreationInfoDto {

    private static final String DEFAULT_NODE_TYPE = "nt:unstructured";

    private final String defaultChildrenType;
    private final List<JcrChildrenNodeType> allowedChildrenTypes;

    public JcrResourceCreationInfoDto(List<JcrChildrenNodeType> allowedChildrenTypes) {
        this.allowedChildrenTypes = allowedChildrenTypes;
        this.defaultChildrenType = allowedChildrenTypes.stream()
                .anyMatch(child -> StringUtils.equals(child.getName(), DEFAULT_NODE_TYPE)) ? DEFAULT_NODE_TYPE : null;
    }

    public String getDefaultChildrenType() {
        return defaultChildrenType;
    }

    public List<JcrChildrenNodeType> getAllowedChildrenTypes() {
        return allowedChildrenTypes;
    }

    public static class JcrChildrenNodeType {

        private final String name;
        private final String allowedChildName;
        private final Map<String, JcrChildrenNodeType> mandatoryChildren;
        private final List<MandatoryJcrChildProperty> mandatoryProperties;

        public JcrChildrenNodeType(String name, String allowedChildName, Map<String, JcrChildrenNodeType> mandatoryChildren,
                                   List<MandatoryJcrChildProperty> mandatoryProperties) {
            this.name = name;
            this.allowedChildName = allowedChildName;
            this.mandatoryChildren = mandatoryChildren;
            this.mandatoryProperties = mandatoryProperties;
        }

        public String getName() {
            return name;
        }

        public String getAllowedChildName() {
            return allowedChildName;
        }

        public Map<String, JcrChildrenNodeType> getMandatoryChildren() {
            return mandatoryChildren;
        }

        public List<MandatoryJcrChildProperty> getMandatoryProperties() {
            return mandatoryProperties;
        }

    }

    public static class MandatoryJcrChildProperty {

        private final String name;
        private final String type;

        private final boolean mandatory;

        public MandatoryJcrChildProperty(PropertyDefinition propertyDefinition) {
            this.name = propertyDefinition.getName();
            this.type = PropertyType.nameFromValue(propertyDefinition.getRequiredType());
            this.mandatory = propertyDefinition.isMandatory();
        }

        public String getName() {
            return name;
        }

        public String getType() {
            return type;
        }

        public boolean isMandatory() {
            return mandatory;
        }

    }

}
