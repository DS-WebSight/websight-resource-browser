package pl.ds.websight.resourcebrowser.service.impl;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.request.RequestParameter;
import org.apache.sling.api.request.RequestParameterMap;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.autosuggestion.dto.SuggestionDto;
import pl.ds.websight.autosuggestion.dto.SuggestionListDto;
import pl.ds.websight.autosuggestion.service.AutosuggestionService;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProvidersControl;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceWrapper;
import pl.ds.websight.resourcebrowser.service.ResourceBrowserService;

import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static java.util.stream.Collectors.toList;

@Component(service = AutosuggestionService.class)
public class AutosuggestionHandlerServiceImpl implements AutosuggestionService {

    private static final Logger LOG = LoggerFactory.getLogger(AutosuggestionHandlerServiceImpl.class);
    private static final String AUTOSUGGESTION_SERVICE_TYPE = "resource-browser";
    private static final String REQUEST_PARAMETER_PROVIDERS = "providers";
    private static final String REQUEST_PARAMETER_HAS_CHILDREN = "hasChildren";
    private static final String REQUEST_PARAMETER_BASE_PATH = "basePath";
    private static final String REQUEST_PARAMETER_QUERY = "query";
    private static final String REQUEST_PARAMETER_LIMIT = "limit";

    private static final int MAX_RESULTS_SIZE = 100;

    @Reference
    private ResourceBrowserService resourceBrowserService;

    @Override
    public String getType() {
        return AUTOSUGGESTION_SERVICE_TYPE;
    }

    @Override
    public SuggestionListDto getSuggestions(ResourceResolver resourceResolver, RequestParameterMap requestParameterMap) {
        RequestParameter[] providersParameter = requestParameterMap.getValues(REQUEST_PARAMETER_PROVIDERS);
        if (providersParameter == null) {
            LOG.warn("Could not get required parameter '{}'", REQUEST_PARAMETER_PROVIDERS);
            return SuggestionListDto.buildEmpty();
        }

        String basePath = StringUtils.defaultIfBlank(getParamStringValue(requestParameterMap, REQUEST_PARAMETER_BASE_PATH), "/");
        if (!StringUtils.startsWith(basePath, "/")) {
            LOG.warn("Parameter '{}' is not absolute path '{}'", REQUEST_PARAMETER_BASE_PATH, basePath);
            return SuggestionListDto.buildEmpty();
        }

        ResourceProvidersControl providersControl = resourceBrowserService.getResourceProvidersControl(
                getProvidersNames(providersParameter), resourceResolver);

        ResourceWrapper providedParent = providersControl.getResource(resourceResolver, basePath);
        if (providedParent == null) {
            LOG.warn("Could not find resource from '{}' parameter", REQUEST_PARAMETER_BASE_PATH);
            return SuggestionListDto.buildEmpty();
        }

        int limit = Integer.parseInt(StringUtils.defaultIfBlank(getParamStringValue(requestParameterMap, REQUEST_PARAMETER_LIMIT), "10"));
        String query = StringUtils.defaultIfBlank(getParamStringValue(requestParameterMap, REQUEST_PARAMETER_QUERY), "");

        return createSuggestionList(providersControl, providedParent, query, Math.min(limit, MAX_RESULTS_SIZE));
    }

    private static List<String> getProvidersNames(RequestParameter[] providersParameter) {
        return Arrays.stream(providersParameter)
                .map(RequestParameter::getString)
                .collect(toList());
    }


    private static SuggestionListDto createSuggestionList(ResourceProvidersControl providersControl, ResourceWrapper providedParent,
                                                          String query, int limit) {
        List<SuggestionDto> suggestions = providersControl.listChildren(providedParent).stream()
                .filter(child -> StringUtils.startsWith(child.getName(), query))
                .map(providedResource -> createSuggestion(providedResource, providersControl))
                .sorted(Comparator.comparing(SuggestionDto::getValue))
                .limit(limit + 1L)
                .collect(toList());
        boolean hasMore = suggestions.size() > limit;
        return SuggestionListDto.buildFromSuggestions(hasMore ? suggestions.subList(0, limit) : suggestions, hasMore);
    }

    private static SuggestionDto createSuggestion(ResourceWrapper providedResource, ResourceProvidersControl providersControl) {
        Map<String, Object> data = new HashMap<>();
        data.put(REQUEST_PARAMETER_PROVIDERS, providedResource.getAvailableProviders());
        data.put(REQUEST_PARAMETER_HAS_CHILDREN, providersControl.hasChildren(providedResource));
        return new SuggestionDto(providedResource.getName(), data);
    }

    private static String getParamStringValue(RequestParameterMap requestParameterMap, String paramName) {
        RequestParameter value = requestParameterMap.getValue(paramName);
        return value != null ? value.getString() : null;
    }

}
