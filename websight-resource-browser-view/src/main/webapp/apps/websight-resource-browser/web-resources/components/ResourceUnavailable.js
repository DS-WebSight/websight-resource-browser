import React from 'react';
import InlineMessage from '@atlaskit/inline-message';
import Tooltip from '@atlaskit/tooltip';
import styled from 'styled-components';

const RESOURCE_PROVIDER_CLASS = 'org.apache.sling.spi.resource.provider.ResourceProvider';

const InlineMessageContainer = styled.div`
    padding-top: 10px;
`;

export const ResourceUnavailable = (props) => {

    const { shadowedBy } = props;

    const createTooltip = (content, text) => {
        return (
            <Tooltip content={content} tag='span' delay={0}>
                <code>{text}</code>
            </Tooltip>
        )
    }

    return (
        <>
            {shadowedBy && (
                <InlineMessageContainer>
                    <InlineMessage
                        type='warning'
                        title={(<span>Resource unavailable via <code>org.apache.sling.api.resource.ResourceResolver</code></span>)}>
                        <>
                            <p>
                                Resource is shadowed by {createTooltip(shadowedBy, shadowedBy.split('.').pop())}.
                            </p>
                            <p>
                                Unless it is done intentionally, make sure that {createTooltip(RESOURCE_PROVIDER_CLASS, 'ResourceProvider')}
                                &nbsp;services are registered with the correct <code>provider.root</code> properties and do not override each
                                other.
                            </p>
                        </>
                    </InlineMessage>
                </InlineMessageContainer>
            )}
        </>
    )
}
