package pl.ds.websight.resourcebrowser.api;

import org.apache.sling.api.resource.PersistenceException;
import org.apache.sling.api.resource.Resource;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.CreateResourceOperation;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.MoveResourceOperation;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.SetPropertyOperation;

import javax.jcr.RepositoryException;
import java.util.List;

public interface SaveOperationProcessor {

    List<AbstractPropertyDto> getProperties(Resource resource);

    int copyResources(Resource resource, List<String> copyResource) throws PersistenceException, RepositoryException;

    int createResources(Resource resource, List<CreateResourceOperation> resourcesToCreate) throws RepositoryException, PersistenceException;

    int moveResource(Resource resource, MoveResourceOperation moveOperation) throws RepositoryException, PersistenceException;

    int removeResources(Resource resource, List<String> resourcesToRemove) throws RepositoryException, PersistenceException;

    int setProperties(Resource resource, List<SetPropertyOperation> propertiesToSet) throws RepositoryException;

    int removeProperties(Resource resource, List<String> propertiesToRemove) throws RepositoryException;

}
