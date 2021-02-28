package pl.ds.websight.resourcebrowser.service.impl;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.api.ResourceCreationInfoService;
import pl.ds.websight.resourcebrowser.dto.impl.JcrResourceCreationInfoDto;
import pl.ds.websight.resourcebrowser.dto.impl.JcrResourceCreationInfoDto.JcrChildrenNodeType;
import pl.ds.websight.resourcebrowser.dto.impl.JcrResourceCreationInfoDto.MandatoryJcrChildProperty;
import pl.ds.websight.resourcebrowser.util.JcrUtil;

import javax.jcr.RepositoryException;
import javax.jcr.Session;
import javax.jcr.Workspace;
import javax.jcr.nodetype.ItemDefinition;
import javax.jcr.nodetype.NodeDefinition;
import javax.jcr.nodetype.NodeType;
import javax.jcr.nodetype.NodeTypeIterator;
import javax.jcr.nodetype.NodeTypeManager;
import javax.jcr.nodetype.PropertyDefinition;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toList;
import static java.util.stream.Collectors.toMap;

@Component(service = ResourceCreationInfoService.class, property = { "provider=" + JcrUtil.JCR_PROVIDER })
public class JcrResourceCreationDetailsServiceImpl implements ResourceCreationInfoService<JcrResourceCreationInfoDto> {

    private static final Logger LOG = LoggerFactory.getLogger(JcrResourceCreationDetailsServiceImpl.class);

    @Override
    public JcrResourceCreationInfoDto getInfo(ResourceResolver resourceResolver, String path, String type) {
        Session session = resourceResolver.adaptTo(Session.class);
        if (session != null) {
            Workspace workspace = session.getWorkspace();
            List<JcrChildrenNodeType> allowedTypes = new ArrayList<>();
            try {
                NodeTypeManager nodeTypeManager = workspace.getNodeTypeManager();
                NodeType nodeType = getNodeType(nodeTypeManager, session, path, type);
                if (nodeType == null) {
                    LOG.warn("Could not obtain requested node type");
                    return null;
                }
                NodeTypeIterator allNodeTypes = nodeTypeManager.getAllNodeTypes();
                Set<String> childrenNames = Arrays.stream(nodeType.getChildNodeDefinitions()).map(nodeDefinition -> nodeDefinition.getName()).collect(
                        Collectors.toSet());
                childrenNames.add("*");
                while (allNodeTypes.hasNext()) {
                    NodeType nextNodeType = (NodeType) allNodeTypes.next();
                    boolean isMixin = nextNodeType.isMixin();
                    boolean isAbstract = nextNodeType.isAbstract();
                    String allowedChildName = getAllowedChildName(nodeType, nextNodeType, childrenNames);
                    if (!isMixin && !isAbstract && StringUtils.isNotBlank(allowedChildName)) {
                        Map<String, JcrChildrenNodeType> requiredChildrenNodes = getRequiredChildren(nextNodeType);
                        List<MandatoryJcrChildProperty> requiredProperties = getRequiredProperties(nextNodeType);
                        allowedTypes.add(new JcrChildrenNodeType(nextNodeType.getName(), allowedChildName, requiredChildrenNodes, requiredProperties));
                    } else {
                        LOG.debug("Skipping node type: {}, mixin: {}, abstract: {}", nextNodeType.getName(), isMixin, isAbstract);
                    }
                }
            } catch (RepositoryException e) {
                LOG.warn("Could not fetch node types", e);
            }
            allowedTypes.sort(Comparator.comparing(JcrChildrenNodeType::getName, String.CASE_INSENSITIVE_ORDER));
            return new JcrResourceCreationInfoDto(allowedTypes);
        } else {
            LOG.warn("Could not get JCR Session");
        }
        return null;
    }

    String getAllowedChildName(NodeType nodeType, NodeType childNodeType, Set<String> childrenNames) {
        return childrenNames.stream().filter(childNodeName -> nodeType.canAddChildNode(childNodeName, childNodeType.getName())).findAny().orElse("");
    }

    private NodeType getNodeType(NodeTypeManager nodeTypeManager, Session session, String path, String type) throws RepositoryException {
       if (nodeTypeManager.hasNodeType(type)) {
           return nodeTypeManager.getNodeType(type);
       }
       if (session.itemExists(path)) {
           return session.getNode(path).getPrimaryNodeType();
       }
       return null;
    }

    private static Map<String, JcrChildrenNodeType> getRequiredChildren(NodeType nodeType) {
        NodeDefinition[] childrenDefinitions = nodeType.getChildNodeDefinitions();
        if (childrenDefinitions != null && childrenDefinitions.length > 0) {
            return Arrays.stream(childrenDefinitions)
                    .filter(ItemDefinition::isMandatory)
                    .collect(toMap(ItemDefinition::getName, definition ->
                            new JcrChildrenNodeType(String.join(", ", getNodeTypes(definition.getRequiredPrimaryTypes())), "", null,
                                    getRequiredProperties(definition.getDeclaringNodeType()))
                    ));
        }
        return Collections.emptyMap();
    }

    private static List<String> getNodeTypes(NodeType... nodeTypes) {
        List<String> result = new ArrayList<>();
        for (NodeType nodeType : nodeTypes) {
            result.add(nodeType.getName());
            NodeTypeIterator subtypes = nodeType.getSubtypes();
            if (subtypes != null) {
                while (subtypes.hasNext()) {
                    result.add(subtypes.nextNodeType().getName());
                }
            }
        }
        return result;
    }

    private static List<MandatoryJcrChildProperty> getRequiredProperties(NodeType nodeType) {
        PropertyDefinition[] propertyDefinitions = nodeType.getPropertyDefinitions();
        if (propertyDefinitions != null && propertyDefinitions.length > 0) {
            return Arrays.stream(propertyDefinitions)
                    .filter(definition -> definition.isMandatory() && !definition.isAutoCreated())
                    .map(MandatoryJcrChildProperty::new)
                    .sorted(Comparator.comparing(MandatoryJcrChildProperty::getName, String.CASE_INSENSITIVE_ORDER))
                    .collect(toList());
        }
        return Collections.emptyList();
    }

}
