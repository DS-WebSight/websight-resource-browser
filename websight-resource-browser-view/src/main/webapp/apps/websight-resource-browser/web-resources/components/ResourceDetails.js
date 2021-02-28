import React from 'react';
import Tabs from '@atlaskit/tabs';
import Tooltip from '@atlaskit/tooltip';
import styled from 'styled-components';

import { TabIcon } from 'websight-admin/Icons';

import ChangelogReadService from '../services/ChangelogReadService.js';
import ResourceProperties from './properties/ResourceProperties.js';
import ResourceService from '../services/ResourceService.js';

const TabContentContainer = styled.div`
    width: 100%;
`;

const SyntheticTabContentContainer = styled(TabContentContainer)`
    padding-top: 20px;
`;

const TabLabel = (props) => {
    const { children, icon, color, tooltip } = props;
    return (
        <Tooltip key={`tooltip-${tooltip}`} content={tooltip} tag='span' delay={200} position='top' hideTooltipOnClick>
            <span>
                <TabIcon className='material-icons-outlined' color={color}>{icon}</TabIcon>
                {children}
            </span>
        </Tooltip>
    )
}

export default class ResourceDetails extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            resource: {},
            properties: {}
        }
    }

    componentDidUpdate(prevProps) {
        const { resource, changelog } = this.props
        const getPropertiesSourcePath = (sourceResource) => {
            if (sourceResource) {
                return sourceResource.movedFrom ? sourceResource.movedFrom : sourceResource.path;
            }
        }
        const providersChanged = (providers) => {
            const prevProviders = prevProps.resource.providers;
            if (providers && prevProviders) {
                if (providers.length !== prevProviders.length) {
                    return true
                } else {
                    for(let i=0; i < providers.length; i++) {
                        if (providers[i].value !== prevProviders[i].value) {
                            return true;
                        }
                    }
                }
                return false;
            }
        }

        if (resource.providers && (providersChanged(resource.providers) || getPropertiesSourcePath(resource) !== getPropertiesSourcePath(prevProps.resource) || ChangelogReadService.isSaved(prevProps.changelog, changelog))) {
            const resourceState = ChangelogReadService.getResourceState(changelog, resource);
            if (!resource.movedFrom && resourceState.created) {
                this.setState({ properties: resourceState.properties });
            } else {
                this.getProperties(resource);
            }
        }
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.resource && nextProps.resource.path !== prevState.resource.path) {
            return { resource: nextProps.resource };
        }
        return null;
    }

    getProperties() {
        const { resource } = this.props;

        ResourceService.listProperties(
            {
                path: resource.movedFrom ? resource.movedFrom.path : resource.path,
                providers: resource.providers.map(provider => provider.value)
            },
            (properties) => {
                this.setState({ properties: properties })
            }
        )
    }

    render() {
        const { properties } = this.state;
        const { resource, changelog, onChangelogUpdate } = this.props;

        if (!resource.providers) return null;

        const { removed } = ChangelogReadService.getResourceState(changelog, resource);
        let tabs = [];
        tabs = resource.providers
            .map(({ label, modifiable, value }) => (
                {
                    label: <TabLabel icon='list' tooltip={value}>{label.replace('Resource', 'Properties')}</TabLabel>,
                    content:
                        <TabContentContainer>
                            <ResourceProperties
                                resource={resource}
                                changelog={changelog}
                                onChangelogUpdate={onChangelogUpdate}
                                modifiable={modifiable && !removed}
                                provider={value}
                                properties={properties[value]}/>
                        </TabContentContainer>
                }
            ));

        if (!tabs.length) {
            tabs = [
                {
                    label: <TabLabel icon='list'>Synthetic Properties</TabLabel>,
                    content:
                        <SyntheticTabContentContainer>
                            <em>{'No properties available'}</em>
                        </SyntheticTabContentContainer>
                }
            ]
        }

        if (!Object.keys(resource).length) return '';

        return (
            <>
                {
                    tabs.length ?
                        <Tabs
                            tabs={tabs}
                        />
                        : ''
                }
            </>
        )
    }
}