package pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation;

import org.apache.commons.lang3.BooleanUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.util.ResourceBrowserUtil;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.text.ParseException;
import java.util.Base64;
import java.util.Calendar;
import java.util.List;

public class SetPropertyOperation {

    private static final Logger LOG = LoggerFactory.getLogger(SetPropertyOperation.class);

    private String name;
    private String value;
    private String type;

    private List<String> values;

    public String getName() {
        return name;
    }

    public Object getValue() {
        return convertToType(value);
    }

    private Object convertToType(String value) {
        String valueType = StringUtils.substringBefore(type, ResourceBrowserUtil.ARRAY_TYPE_SUFFIX);
        if (valueType == null || value == null) {
            return value;
        }
        switch (valueType) {
            case "Binary":
                return new ByteArrayInputStream(Base64.getDecoder().decode(value));
            case "Boolean":
                return BooleanUtils.toBoolean(value);
            case "Date":
                return getParsedDate(value);
            case "Decimal":
                return new BigDecimal(value);
            case "Double":
                return Double.parseDouble(value);
            case "Long":
                return Long.parseLong(value);
            default:
                return value;
        }
    }

    private Object getParsedDate(String value) {
        try {
            Calendar calendar = Calendar.getInstance();
            calendar.setTime(DateUtils.parseDate(value, "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ss.SSSZ"));
            return calendar;
        } catch (ParseException e) {
            LOG.warn("Could not parse date value {}", value, e);
        }
        return value;
    }

    public String getType() {
        return type;
    }

    public Object[] getValues() {
        return values == null ? null : values.stream()
                .map(this::convertToType)
                .toArray();
    }

}
