package pl.ds.websight.resourcebrowser.dto.impl;

import org.apache.commons.lang3.StringUtils;
import pl.ds.websight.resourcebrowser.api.AbstractPropertyDto;
import pl.ds.websight.resourcebrowser.util.ResourceBrowserUtil;

import javax.jcr.Property;
import javax.jcr.PropertyType;
import javax.jcr.RepositoryException;
import javax.jcr.Value;
import javax.jcr.nodetype.PropertyDefinition;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static java.util.stream.Collectors.toList;

public class JcrPropertyDto extends AbstractPropertyDto {

    private boolean autoCreated;
    private boolean mandatory;
    private boolean modifiable;

    public JcrPropertyDto(Property property) throws RepositoryException {
        this.name = property.getName();
        if (property.isMultiple()) {
            this.type = PropertyType.nameFromValue(property.getType()) + ResourceBrowserUtil.ARRAY_TYPE_SUFFIX;
            if (isBinary()) {
                this.value = Arrays.stream(property.getValues()).map(binaryValue -> BINARY_PLACEHOLDER).collect(toList());
            } else {
                List<String> result = new ArrayList<>();
                for (Value valueObject : property.getValues()) {
                    result.add(valueObject.getString());
                }
                this.value = result;
            }
        } else {
            this.type = PropertyType.nameFromValue(property.getType());
            this.value = isBinary() ? BINARY_PLACEHOLDER : property.getValue().getString();
        }
        PropertyDefinition definition = property.getDefinition();
        if (definition != null) {
            this.autoCreated = definition.isAutoCreated();
            this.mandatory = definition.isMandatory();
            this.modifiable = !definition.isProtected();
        }
    }

    private boolean isBinary() {
        return StringUtils.equals(StringUtils.removeEnd(type, ResourceBrowserUtil.ARRAY_TYPE_SUFFIX), PropertyType.TYPENAME_BINARY);
    }

    public boolean isAutoCreated() {
        return autoCreated;
    }

    public boolean isMandatory() {
        return mandatory;
    }

    public boolean isModifiable() {
        return modifiable;
    }

}
