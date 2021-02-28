package pl.ds.websight.resourcebrowser.rest.processor.impl;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.ModifiableValueMap;
import org.apache.sling.api.resource.PersistenceException;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ValueMap;
import pl.ds.websight.resourcebrowser.api.AbstractPropertyDto;
import pl.ds.websight.resourcebrowser.api.SaveOperationProcessor;
import pl.ds.websight.resourcebrowser.dto.ResourcePropertyDto;
import pl.ds.websight.resourcebrowser.resourceprovider.AuthenticatedResourceProvider;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.CreateResourceOperation;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.MoveResourceOperation;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.SetPropertyOperation;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static java.util.stream.Collectors.toList;

public class DefaultSaveOperationProcessor implements SaveOperationProcessor {

    private final AuthenticatedResourceProvider provider;

    public DefaultSaveOperationProcessor(AuthenticatedResourceProvider provider) {
        this.provider = provider;
    }

    @Override
    public List<AbstractPropertyDto> getProperties(Resource resource) {
        return resource.getValueMap().entrySet().stream()
                .map(propertyEntry -> new ResourcePropertyDto(propertyEntry.getKey(), propertyEntry.getValue()))
                .sorted(Comparator.comparing(AbstractPropertyDto::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(toList());
    }

    @Override
    public int copyResources(Resource resource, List<String> resourcesToCopy) throws PersistenceException {
        int resourceCopiesAmount = 0;
        if (resourcesToCopy != null) {
            String sourcePath = resource.getPath();
            for (String destinationPath : resourcesToCopy) {
                provider.copyResource(sourcePath, destinationPath);
                resourceCopiesAmount++;
            }
        }
        return resourceCopiesAmount;
    }

    @Override
    public int createResources(Resource resource, List<CreateResourceOperation> resourcesToCreate) throws PersistenceException {
        int createResourcesAmount = 0;
        if (resourcesToCreate != null) {
            for (CreateResourceOperation resourceToCreate : resourcesToCreate) {
                createResourcesAmount += createResource(resourceToCreate, resource);
            }
        }
        return createResourcesAmount;
    }

    @Override
    public int moveResource(Resource resource, MoveResourceOperation moveOperation) throws PersistenceException {
        if (moveOperation != null) {
            Map<String,Object> properties = resource.adaptTo(ValueMap.class);

            String destinationName = StringUtils.substringAfterLast(moveOperation.getDestination(), "/");
            Resource parentResource = resource.getParent();
            provider.createResource(parentResource, destinationName, properties);
            provider.removeResource(parentResource, resource.getName());
            return 1;
        }
        return 0;
    }

    @Override
    public int removeResources(Resource resource, List<String> resourcesToRemove) throws PersistenceException {
        int removeResourcesAmount = 0;
        if (resourcesToRemove != null) {
            for (String resourceToRemoveName : resourcesToRemove) {
                provider.removeResource(resource, resourceToRemoveName);
                removeResourcesAmount++;
            }
        }
        return removeResourcesAmount;
    }

    private int createResource(CreateResourceOperation resourceToCreate, Resource parent) throws PersistenceException {
        int createNodesAmount = 0;
        String name = resourceToCreate.getName();
        Map<String, Object> properties = getPropertiesToCreate(resourceToCreate);
        Resource createdResource = Objects.requireNonNull(provider.createResource(parent, name, properties),
                String.format("Could not create Resource %s under %s", name, parent.getPath()));
        for (CreateResourceOperation childToCreate : resourceToCreate.getChildren()) {
            createNodesAmount += createResource(childToCreate, createdResource);
        }
        return createNodesAmount + 1;
    }

    private static Map<String, Object> getPropertiesToCreate(CreateResourceOperation nodeToCreate) {
        List<SetPropertyOperation> propertiesToSet = nodeToCreate.getProperties();
        if (propertiesToSet != null) {
            Map<String, Object> propertiesToCreate = new HashMap<>();
            nodeToCreate.getProperties().forEach(property -> propertiesToCreate.put(property.getName(),
                            property.getValues() == null ? property.getValue() : property.getValues()));
            return propertiesToCreate;
        }
        return null;
    }

    @Override
    public int setProperties(Resource resource, List<SetPropertyOperation> propertiesToSet) {
        if (propertiesToSet != null) {
            ModifiableValueMap properties = Objects.requireNonNull(resource.adaptTo(ModifiableValueMap.class));
            propertiesToSet.forEach(property -> {
                boolean isMultiValue = property.getValues() != null;
                properties.put(property.getName(), isMultiValue ? property.getValues() : property.getValue());
            });
            return propertiesToSet.size();
        }
        return 0;
    }

    @Override
    public int removeProperties(Resource resource, List<String> propertiesToRemove) {
        int removedPropertiesAmount = 0;
        if (propertiesToRemove != null) {
            ModifiableValueMap properties = Objects.requireNonNull(resource.adaptTo(ModifiableValueMap.class));
            for (String propertyName : propertiesToRemove) {
                if (properties.containsKey(propertyName)) {
                    properties.remove(propertyName);
                    removedPropertiesAmount++;
                }
            }
        }
        return removedPropertiesAmount;
    }

}
