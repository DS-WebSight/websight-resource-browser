package pl.ds.websight.resourcebrowser.rest;

public final class Messages {

    // Find resources:
    public static final String QUICK_SEARCH_ERROR = "Could not find resources";

    // Get file content:
    public static final String GET_RESOURCE_CONTENT_ERROR = "Could not fetch resource content";
    public static final String GET_RESOURCE_CONTENT_ERROR_DETAILS = "Could not read resource '%s' binary content";
    public static final String GET_RESOURCE_CONTENT_ERROR_NOT_EXISTS = "Could not fetch resource";
    public static final String GET_RESOURCE_CONTENT_ERROR_NOT_EXISTS_DETAILS = "Could not find resource '%s'";
    public static final String GET_RESOURCE_CONTENT_ERROR_NOT_PROVIDED = "Could not fetch resource";
    public static final String GET_RESOURCE_CONTENT_ERROR_NOT_PROVIDED_DETAILS = "Could not find resource '%s' within requested providers";

    // Get properties:
    public static final String GET_PROPERTIES_ERROR = "Could not fetch properties";
    public static final String GET_PROPERTIES_ERROR_DETAILS = "Could not find resource '%s'";

    // List resources:
    public static final String LIST_RESOURCES_ERROR = "Could not list resources";

    // List resource providers:
    public static final String LIST_RESOURCE_PROVIDERS_ERROR = "Could not list resource providers";

    // Node creation info:
    public static final String NODE_CREATION_INFO_ERROR = "Could not get node creation info";

    // Save changes:
    public static final String SAVE_CHANGES_SUCCESS = "Changes saved";
    public static final String SAVE_CHANGES_SUCCESS_DETAILS = "Saved %d %s";
    public static final String SAVE_CHANGES_ERROR = "Could not save changes";
    public static final String SAVE_CHANGES_ERROR_NOT_FOUND = "Could not find resource";
    public static final String SAVE_CHANGES_ERROR_NOT_FOUND_DETAILS = "Resource '%s' is unavailable in '%s' ResourceProvider";
    public static final String SAVE_CHANGES_ERROR_UNMODIFIABLE = "Could not modify resource";
    public static final String SAVE_CHANGES_ERROR_UNMODIFIABLE_DETAILS = "Resource '%s' provided by '%s' is unmodifiable";

    private Messages() {
        // no instances
    }

    public static String formatMessage(String message, Object... args) {
        return String.format(message, args);
    }
}
