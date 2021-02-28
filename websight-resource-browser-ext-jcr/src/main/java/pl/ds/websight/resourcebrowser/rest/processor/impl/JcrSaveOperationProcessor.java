package pl.ds.websight.resourcebrowser.rest.processor.impl;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.PersistenceException;
import org.apache.sling.api.resource.Resource;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.api.AbstractPropertyDto;
import pl.ds.websight.resourcebrowser.dto.impl.JcrPropertyDto;
import pl.ds.websight.resourcebrowser.api.SaveOperationProcessor;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.CreateResourceOperation;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.MoveResourceOperation;
import pl.ds.websight.resourcebrowser.rest.requestparameter.saveoperation.SetPropertyOperation;
import pl.ds.websight.resourcebrowser.util.JcrUtil;
import pl.ds.websight.resourcebrowser.util.ResourceBrowserUtil;

import javax.jcr.Binary;
import javax.jcr.Node;
import javax.jcr.PropertyIterator;
import javax.jcr.PropertyType;
import javax.jcr.RepositoryException;
import javax.jcr.Session;
import javax.jcr.Value;
import javax.jcr.ValueFactory;
import javax.jcr.nodetype.NodeTypeDefinition;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Comparator;
import java.util.LinkedList;
import java.util.List;
import java.util.Objects;

@Component(service= SaveOperationProcessor.class, property={"provider=" + JcrUtil.JCR_PROVIDER})
public class JcrSaveOperationProcessor implements SaveOperationProcessor {

    private static final Logger LOG = LoggerFactory.getLogger(JcrSaveOperationProcessor.class);

    @Override
    public List<AbstractPropertyDto> getProperties(Resource resource) {
        Node node = Objects.requireNonNull(resource.adaptTo(Node.class));
        List<AbstractPropertyDto> properties = new LinkedList<>();
        try {
            final PropertyIterator nodeProperties = node.getProperties();
            while (nodeProperties.hasNext()) {
                properties.add(new JcrPropertyDto(nodeProperties.nextProperty()));
            }
        } catch (RepositoryException e) {
            LOG.warn("Could not get properties of {}", resource.getPath(), e);
        }
        properties.sort(Comparator.comparing(AbstractPropertyDto::getName, String.CASE_INSENSITIVE_ORDER));
        return properties;
    }

    @Override
    public int copyResources(Resource resource, List<String> resourcesToCopy) throws RepositoryException {
        int resourceCopiesAmount = 0;
        if (resourcesToCopy != null) {
            Node sourceNode = Objects.requireNonNull(resource.adaptTo(Node.class));
            for (String destinationPath : resourcesToCopy) {
                String name = StringUtils.substringAfterLast(destinationPath, "/");
                String destinationParentPath = StringUtils.defaultIfBlank(StringUtils.substringBeforeLast(destinationPath, "/"), "/");
                if (sourceNode.getSession().nodeExists(destinationParentPath)) {
                    JcrUtil.copy(sourceNode, sourceNode.getSession().getNode(destinationParentPath), name);
                    resourceCopiesAmount++;
                }
            }
        }
        return resourceCopiesAmount;
    }

    @Override
    public int createResources(Resource resource, List<CreateResourceOperation> nodesToCreate) throws RepositoryException {
        int createNodesAmount = 0;
        if (nodesToCreate != null) {
            Node parentNode = Objects.requireNonNull(resource.adaptTo(Node.class));
            for (CreateResourceOperation nodeToCreate : nodesToCreate) {
                createNodesAmount += addNode(nodeToCreate, parentNode);
            }
        }
        return createNodesAmount;
    }

    @Override
    public int moveResource(Resource resource, MoveResourceOperation moveOperation) throws RepositoryException {
        int moveResourceChangeAmount = 0;
        if (moveOperation != null) {
            Node node = Objects.requireNonNull(resource.adaptTo(Node.class));
            Session session = node.getSession();
            if (session != null) {
                String sourcePath = node.getPath();
                String destinationPath = moveOperation.getDestination();
                if (!StringUtils.equals(sourcePath, destinationPath)) {
                    session.move(node.getPath(), moveOperation.getDestination());
                    moveResourceChangeAmount++;
                }

                String orderBefore = moveOperation.getOrderBefore();
                String destinationParentPath = StringUtils.defaultIfBlank(StringUtils.substringBeforeLast(destinationPath, "/"), "/");
                if (StringUtils.isNotBlank(orderBefore) && session.nodeExists(destinationParentPath)) {
                    Node destinationParent = session.getNode(destinationParentPath);
                    if (isOrderable(destinationParent) && session.nodeExists(orderBefore)) {
                        destinationParent.orderBefore(node.getName(), StringUtils.substringAfterLast(orderBefore, "/"));
                        moveResourceChangeAmount++;
                    }
                }
            }
        }
        return moveResourceChangeAmount;
    }

    private boolean isOrderable(Node node) throws RepositoryException {
        return node.getPrimaryNodeType().hasOrderableChildNodes() ||
                Arrays.stream(node.getMixinNodeTypes()).anyMatch(NodeTypeDefinition::hasOrderableChildNodes);
    }

    @Override
    public int removeResources(Resource resource, List<String> nodesToRemove) throws RepositoryException {
        int removeNodesAmount = 0;
        if (nodesToRemove != null) {
            Node parentNode = resource.adaptTo(Node.class);
            if (parentNode != null) {
                for (String nodeToRemoveName : nodesToRemove) {
                    Node nodeToRemove = parentNode.getNode(nodeToRemoveName);
                    if (nodeToRemove != null) {
                        nodeToRemove.remove();
                        removeNodesAmount++;
                    }
                }
            }
        }
        return removeNodesAmount;
    }

    private static int addNode(CreateResourceOperation nodeToCreate, Node parentNode) throws RepositoryException {
        int createNodesAmount = 0;
        Node createdNode = parentNode.addNode(nodeToCreate.getName(), nodeToCreate.getType());
        List<SetPropertyOperation> setPropertyOperations = nodeToCreate.getProperties();
        if (setPropertyOperations != null) {
            for (SetPropertyOperation propertyAction : nodeToCreate.getProperties()) {
                addProperty(createdNode, propertyAction);
            }
        }
        List<CreateResourceOperation> childrenToCreate = nodeToCreate.getChildren();
        if (childrenToCreate != null) {
            for (CreateResourceOperation childToCreate : childrenToCreate) {
                createNodesAmount += addNode(childToCreate, createdNode);
            }
        }
        return createNodesAmount + 1;
    }

    @Override
    public int setProperties(Resource resource, List<SetPropertyOperation> propertiesToSet) throws RepositoryException {
        int setPropertiesAmount = 0;
        if (propertiesToSet != null) {
            Node node = Objects.requireNonNull(resource.adaptTo(Node.class));
            for (SetPropertyOperation propertyAction : propertiesToSet) {
                String propertyName = propertyAction.getName();
                if ((node.hasProperty(propertyName) && !node.getProperty(propertyName).getDefinition().isProtected()) ||
                        !node.hasProperty(propertyName)) {
                    addProperty(node, propertyAction);
                    setPropertiesAmount++;
                }
            }
        }
        return setPropertiesAmount;
    }

    private static void addProperty(Node node, SetPropertyOperation propertyAction) throws RepositoryException {
        boolean isMultiValue = propertyAction.getValues() != null;
        if (isMultiValue) {
            node.setProperty(propertyAction.getName(), createValues(node.getSession(), propertyAction));
        } else {
            node.setProperty(propertyAction.getName(), createValue(node.getSession(), propertyAction.getType(), propertyAction.getValue()));
        }
    }

    private static Value[] createValues(Session session, SetPropertyOperation propertyAction) throws RepositoryException {
        Object[] values = propertyAction.getValues();
        Value[] newValues = new Value[values.length];
        for (int i = 0; i < newValues.length; i++) {
            newValues[i] = createValue(session, propertyAction.getType(), values[i]);
        }
        return newValues;
    }

    private static Value createValue(Session session, String type, Object value) throws RepositoryException {
        ValueFactory valueFactory = session.getValueFactory();
        int propertyType = PropertyType.valueFromName(StringUtils.substringBefore(type, ResourceBrowserUtil.ARRAY_TYPE_SUFFIX));
        if (propertyType == PropertyType.BINARY) {
            Binary binary = valueFactory.createBinary((InputStream) value);
            return valueFactory.createValue(binary);
        } else if (propertyType == PropertyType.DATE) {
            return valueFactory.createValue((Calendar) value);
        }
        return valueFactory.createValue(value.toString(), propertyType);
    }

    @Override
    public int removeProperties(Resource resource, List<String> propertiesToRemove) throws RepositoryException {
        int removedPropertiesAmount = 0;
        if (propertiesToRemove != null) {
            Node node = Objects.requireNonNull(resource.adaptTo(Node.class));
            for (String propertyName : propertiesToRemove) {
                if (node.hasProperty(propertyName)) {
                    javax.jcr.Property property = node.getProperty(propertyName);
                    if (!property.getDefinition().isProtected()) {
                        property.remove();
                        removedPropertiesAmount++;
                    }
                }
            }
        }
        return removedPropertiesAmount;
    }

}

