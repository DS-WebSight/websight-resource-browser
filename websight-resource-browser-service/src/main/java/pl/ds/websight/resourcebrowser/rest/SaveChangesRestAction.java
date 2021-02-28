package pl.ds.websight.resourcebrowser.rest;

import org.apache.sling.api.resource.PersistenceException;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import pl.ds.websight.resourcebrowser.api.SaveOperationProcessor;
import pl.ds.websight.resourcebrowser.resourceprovider.AuthenticatedResourceProvider;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProviderInfo;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceWrapper;
import pl.ds.websight.resourcebrowser.rest.processor.impl.SaveOperationProcessors;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.Change;
import pl.ds.websight.resourcebrowser.service.ResourceBrowserService;
import pl.ds.websight.rest.framework.RestAction;
import pl.ds.websight.rest.framework.RestActionResult;
import pl.ds.websight.rest.framework.annotations.SlingAction;

import javax.jcr.RepositoryException;
import javax.jcr.Session;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static java.util.Collections.singletonList;

@Component
@SlingAction
public class SaveChangesRestAction extends AbstractRestAction<SaveChangesRestModel, Void>
        implements RestAction<SaveChangesRestModel, Void> {

    @Reference
    private ResourceBrowserService resourceBrowserService;

    @Reference
    private SaveOperationProcessors saveOperationProcessors;

    @Override
    protected RestActionResult<Void> performAction(SaveChangesRestModel model) throws PersistenceException {
        ResourceResolver resourceResolver = model.getResourceResolver();
        int savedActionsAmount = 0;
        try {
            List<AuthenticatedResourceProvider> providersToCommit = new ArrayList<>();
            for (Map.Entry<String, List<Change>> changeRecord : model.getChangelog().entrySet()) {
                for (Change changes : changeRecord.getValue()) {
                    Map.Entry<AuthenticatedResourceProvider, Resource> variant =
                            getResourceToModify(resourceResolver, changes.getProvider(),
                                    changeRecord.getKey());
                    if (variant == null) {
                        return RestActionResult.failure(Messages.SAVE_CHANGES_ERROR_NOT_FOUND,
                                String.format(Messages.SAVE_CHANGES_ERROR_NOT_FOUND_DETAILS, changeRecord.getKey(), changes.getProvider()));
                    }
                    ResourceProviderInfo providerInfo = variant.getKey().getInfo();
                    if (!providerInfo.isModifiable()) {
                        return RestActionResult.failure(Messages.SAVE_CHANGES_ERROR_UNMODIFIABLE,
                                String.format(Messages.SAVE_CHANGES_ERROR_UNMODIFIABLE_DETAILS, changeRecord.getKey(),
                                        changes.getProvider()));
                    }
                    if (!providersToCommit.contains(variant.getKey())) {
                        providersToCommit.add(variant.getKey());
                    }
                    savedActionsAmount += performChanges(variant, changes);
                }
            }
            save(model.getSession(), providersToCommit);
        } catch (RepositoryException e) {
            throw new PersistenceException(e.getMessage(), e);
        }
        String messageSuffix = savedActionsAmount > 1 ? "changes" : "change";
        return RestActionResult.success(Messages.SAVE_CHANGES_SUCCESS,
                String.format(Messages.SAVE_CHANGES_SUCCESS_DETAILS, savedActionsAmount, messageSuffix));
    }

    private Map.Entry<AuthenticatedResourceProvider, Resource> getResourceToModify(ResourceResolver resourceResolver, String providerName,
            String path) {
        ResourceWrapper providedResource = resourceBrowserService.getResourceProvidersControl(singletonList(providerName),
                resourceResolver).getResource(resourceResolver, path);
        if (providedResource != null) {
            return providedResource.getPrimaryVariant();
        }
        return null;
    }

    private int performChanges(Map.Entry<AuthenticatedResourceProvider, Resource> variant, Change changes) throws PersistenceException,
            RepositoryException {
        SaveOperationProcessor processor = saveOperationProcessors.getProcessor(variant);
        Resource resource = variant.getValue();
        int changeAmount = processor.removeResources(resource, changes.getRemoveResource());
        changeAmount += processor.createResources(resource, changes.getCreateResource());
        changeAmount += processor.removeProperties(resource, changes.getRemoveProperty());
        changeAmount += processor.setProperties(resource, changes.getSetProperty());
        changeAmount += processor.moveResource(resource, changes.getMoveResource());
        changeAmount += processor.copyResources(resource, changes.getCopyResource());
        return changeAmount;
    }

    private static void save(Session session, List<AuthenticatedResourceProvider> providers) throws PersistenceException,
            RepositoryException {
        if (session.hasPendingChanges()) {
            session.save();
        }
        for (AuthenticatedResourceProvider provider : providers) {
            provider.commit();
        }
    }

    @Override
    protected String getUnexpectedErrorMessage() {
        return Messages.SAVE_CHANGES_ERROR;
    }

}
