package pl.ds.websight.resourcebrowser.rest;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.PersistenceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.rest.framework.RestAction;
import pl.ds.websight.rest.framework.RestActionResult;

public abstract class AbstractRestAction<T, R> implements RestAction<T, R> {

    private static final Logger LOG = LoggerFactory.getLogger(AbstractRestAction.class);

    @Override
    public RestActionResult<R> perform(T model) {
        try {
            return performAction(model);
        } catch (Exception e) {
            LOG.warn("Could not perform action", e);
            String messageDetails = e.getClass().getSimpleName();
            String exceptionMessage = e.getMessage();
            if (StringUtils.isNotBlank(e.getMessage())) {
                messageDetails += ": " + exceptionMessage;
            }
            return RestActionResult.failure(getUnexpectedErrorMessage(), messageDetails);
        }
    }

    protected abstract RestActionResult<R> performAction(T model) throws PersistenceException;

    protected abstract String getUnexpectedErrorMessage();

}
