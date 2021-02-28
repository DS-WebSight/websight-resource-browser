package pl.ds.websight.resourcebrowser.dto;

import org.apache.commons.lang3.time.DateFormatUtils;
import pl.ds.websight.resourcebrowser.api.AbstractPropertyDto;
import pl.ds.websight.resourcebrowser.util.ResourceBrowserUtil;

import java.io.InputStream;
import java.util.Arrays;
import java.util.Calendar;

import static java.util.stream.Collectors.toList;

public class ResourcePropertyDto extends AbstractPropertyDto {

    public ResourcePropertyDto(String name, Object value) {
        this.name = name;
        if (value != null) {
            if (value.getClass().isArray()) {
                this.value = Arrays.stream((Object[]) value).map(this::initValue).collect(toList());
                this.type += ResourceBrowserUtil.ARRAY_TYPE_SUFFIX;
            } else {
                this.value = initValue(value);
            }
        }
    }

    private Object initValue(Object value) {
        if (value instanceof Calendar) {
            this.type = "Date";
            return DateFormatUtils.ISO_8601_EXTENDED_DATETIME_TIME_ZONE_FORMAT.format((Calendar) value);
        } else if (value instanceof InputStream) {
            this.type = "Binary";
            return BINARY_PLACEHOLDER;
        }
        this.type = value.getClass().getSimpleName();
        return value;
    }

}
