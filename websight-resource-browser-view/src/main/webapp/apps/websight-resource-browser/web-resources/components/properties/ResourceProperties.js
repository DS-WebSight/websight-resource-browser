import React from 'react';
import TableTree, { Header, Headers, Rows } from '@atlaskit/table-tree';
import styled from 'styled-components';

import ChangelogReadService from '../../services/ChangelogReadService.js';
import ChangelogWriteService from '../../services/ChangelogWriteService.js';
import PropertyCreationSection from './PropertyCreationSection.js';
import PropertyRow from './PropertyRow.js';
import { PROPERTY_TYPE } from '../../utils/ResourceBrowserConstants.js';

const TableContainer = styled.div`
    height: 100%;

    & > div {
        height: 100%;
    }
`;

const PropertiesHeadersWrapper = styled.div`
    & > div {
        padding-right: 20px;
    }
`;

const TableRowsContainer = styled.div`
    --header-tabs-height: 42px;

    font-size: 12px;
    height: calc(100% - var(--header-tabs-height));
    overflow-x: hidden;
    overflow-y: overlay;

    div[class^="styled__Cell"] {
        min-height: 28px;
        padding-top: 0;
        padding-bottom: 0;
        &:hover .remove-icon {
            display: block !important;
        }
    }
    span[class^="styled__OverflowContainer"] {
        width: 100%;
    }
    .inline-editfield {
        border: 0;
        color: inherit;
        font-size: 12px;
        padding: 0;
        min-height: 26px;
    }
`;

export default class ResourceProperties extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            createdProperties: []
        }
        this.onCreateProperty = this.onCreateProperty.bind(this);
        this.onCreatedPropertyChange = this.onCreatedPropertyChange.bind(this);
        this.onCreatedPropertyRemove = this.onCreatedPropertyRemove.bind(this);
        this.isDuplicated = this.isDuplicated.bind(this);

    }

    componentDidUpdate(prevProps) {
        const { changelog, provider, resource } = this.props;
        const resourceState = ChangelogReadService.getResourceState(changelog, resource);

        const isRemoved = prevProps.resource.path !== resource.path &&
        (resourceState.properties[provider] && !Object.entries(resourceState.properties[provider]).length);

        if (isRemoved || ChangelogReadService.isSaved(prevProps.changelog, this.props.changelog)) {
            this.setState({ createdProperties: [] });
        }
    }

    onCreateProperty(newProperty) {
        const { resource, provider } = this.props;
        this.setState((prevState) => {
            const ids = prevState.createdProperties.map(({ id }) => id)
            const lastMaxIdNumber = ids && ids.length ? Math.max(...ids) : 0;
            const nextId = lastMaxIdNumber + 1;
            // id '0' is reserved for type property
            return { createdProperties: [
                ...prevState.createdProperties,
                {
                    id: nextId,
                    modifiable: true,
                    type: PROPERTY_TYPE.STRING,
                    resourcePath: resource.path,
                    resourceProvider: provider,
                    ...newProperty
                }
            ] }
        })
    }

    onCreatedPropertyChange(property) {
        const { id } = property;
        const { changelog, onChangelogUpdate, resource, provider } = this.props;

        this.setState((prevState) => {
            const updatedCreatedProperties = prevState.createdProperties.map((prop) => {
                if (prop.id === id) {
                    return { ...prop, ...property }
                }
                return prop;
            });

            prevState.createdProperties.forEach((prop) => {
                ChangelogWriteService.undoSetProperty(changelog, resource.path, provider, prop.name);
                onChangelogUpdate(changelog);
            });

            updatedCreatedProperties.forEach((prop) => {
                if (!this.isDuplicated(prop)) {
                    if (prop.name) {
                        ChangelogWriteService.setProperty(changelog, resource.path, provider, prop.name, prop.type, prop.value || '');
                    }
                    onChangelogUpdate(changelog);
                }
            });

            return { createdProperties: updatedCreatedProperties }
        })
    }

    onCreatedPropertyRemove(property) {
        const { changelog, onChangelogUpdate, resource, provider } = this.props;
        this.setState((prevState) => {
            const updatedCreatedProperties =
                prevState.createdProperties.filter((prop) => prop.id !== property.id);

            prevState.createdProperties.forEach((prop) => {
                ChangelogWriteService.undoSetProperty(changelog, resource.path, provider, prop.name);
                onChangelogUpdate(changelog);
            });

            updatedCreatedProperties.forEach((prop) => {
                if (!this.isDuplicated(prop, updatedCreatedProperties)) {
                    if (prop.name) {
                        ChangelogWriteService.setProperty(changelog, resource.path, provider, prop.name, prop.type, prop.value || '');
                    }
                    onChangelogUpdate(changelog);
                }
            });

            return { createdProperties: updatedCreatedProperties }
        });

    }

    isDuplicated(property, updatedCreatedProperties) {
        let { createdProperties } = this.state;
        const { resource, properties } = this.props;
        const { id, name } = property;

        const isAlreadyDeclared = !resource.fromChangelog && properties.some(declared => declared.name === name);
        if (updatedCreatedProperties) {
            createdProperties = updatedCreatedProperties;
        }
        const isAlreadyCreated = createdProperties.some(created => created.name === name && created.id < id);

        return isAlreadyDeclared || isAlreadyCreated;
    }

    render() {
        const { properties, resource, modifiable, changelog, onChangelogUpdate, provider } = this.props;
        const tableTreeHeaders = (
            <PropertiesHeadersWrapper>
                <Headers>
                    <Header width={'20%'}>Name</Header>
                    <Header width={'15%'}>Type</Header>
                    <Header width={'calc(65% - 100px - 50px)'}>Value</Header>
                    <Header width={'100px'}>Details</Header>
                    <Header width={'10px'}></Header>
                </Headers>
            </PropertiesHeadersWrapper>
        );

        const resourceCreatedProperties = this.state.createdProperties.filter((prop) => {
            return prop.resourcePath === resource.path && prop.resourceProvider === provider;
        })

        return (
            <TableContainer>
                <TableTree>
                    {tableTreeHeaders}
                    <TableRowsContainer>
                        {!resource.fromChangelog && (
                            <Rows
                                items={properties}
                                render={(property) => (
                                    <PropertyRow
                                        property={property}
                                        onChangelogUpdate={onChangelogUpdate}
                                        changelog={changelog}
                                        provider={provider}
                                        resource={resource}/>
                                )}
                            />
                        )}
                        {modifiable && !resource.isCopy && (
                            <PropertyCreationSection
                                changelog={changelog}
                                createdProperties={resourceCreatedProperties}
                                onChangelogUpdate={onChangelogUpdate}
                                onCreateProperty={this.onCreateProperty}
                                onCreatedPropertyChange={this.onCreatedPropertyChange}
                                onCreatedPropertyRemove={this.onCreatedPropertyRemove}
                                isDuplicated={this.isDuplicated}
                                provider={provider}
                                resource={resource}/>
                        )}
                    </TableRowsContainer>
                </TableTree>
            </TableContainer>
        )
    }
}