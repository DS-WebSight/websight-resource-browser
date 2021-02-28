package pl.ds.websight.resourcebrowser.util;

import java.util.Arrays;
import java.util.List;
import javax.jcr.Node;
import javax.jcr.NodeIterator;
import javax.jcr.Property;
import javax.jcr.PropertyIterator;
import javax.jcr.RepositoryException;
import javax.jcr.nodetype.NodeType;

public class JcrUtil {

    public static final String JCR_PROVIDER = "org.apache.sling.jcr.resource.internal.helper.jcr.JcrResourceProvider";

    private static final List<Character> LUCENE_SPECIAL_CHARACTERS = Arrays.asList(
            '+', '-', '&', '|', '!', '(', ')', '{', '}', '[', ']', '^', '\"', '~', '*', '?', ':', '/', '\\'
    );

    private JcrUtil() {
        // no instances
    }

    public static void copy(final Node srcNode, final Node dstParent, final String name) throws RepositoryException {
        Node dstNode = dstParent.addNode(name, srcNode.getPrimaryNodeType().getName());

        for(NodeType nt : srcNode.getMixinNodeTypes()) {
            dstNode.addMixin(nt.getName());
        }

        PropertyIterator iterator = srcNode.getProperties();
        while (iterator.hasNext()) {
            Property property = iterator.nextProperty();
            copy(property, dstNode);
        }

        NodeIterator nodeIterator = srcNode.getNodes();
        while (nodeIterator.hasNext()) {
            Node node = nodeIterator.nextNode();
            if (!node.getDefinition().isProtected()) {
                copy(node, dstNode, node.getName());
            }
        }

    }

    private static Node copy(final Property srcProperty, final Node dstNode) throws RepositoryException {
        final String propertyName = srcProperty.getName();

        if (srcProperty.getDefinition().isProtected()) {
            return null;
        }

        if(dstNode.hasProperty(propertyName)) {
            dstNode.getProperty(propertyName).remove();
        }
        if (srcProperty.isMultiple()) {
            dstNode.setProperty(propertyName, srcProperty.getValues());
        } else {
            dstNode.setProperty(propertyName, srcProperty.getValue());
        }
        return dstNode;
    }

    public static String escape(final String value) {
        final StringBuilder stringBuilder = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            final char character = value.charAt(i);
            if (LUCENE_SPECIAL_CHARACTERS.contains(character)) {
                stringBuilder.append('\\');
            }
            stringBuilder.append(character);
        }
        return escapeApostropheCharacters(stringBuilder.toString());
    }

    private static String escapeApostropheCharacters(final String value) {
        return value.replace("'", "''");
    }

}
