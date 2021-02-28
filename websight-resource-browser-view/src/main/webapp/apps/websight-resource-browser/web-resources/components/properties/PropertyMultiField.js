import React from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import Button from '@atlaskit/button';
import styled from 'styled-components';

import { colors } from 'websight-admin/theme';

import PropertyValueField from './PropertyValueField.js';

const ActionBar = styled.div`
    display: inline-flex;
    flex-direction: column;
`;

const DraggableContainer = styled.div`
    align-items: center;
    display: flex;
    min-height: 26px;
    height: auto;
`;

const ReorderIcon = styled.i`
    color: ${colors.grey};
    font-size: 14px;
    margin-right: 3px;
`;

const valueButtonStyle = {
    marginTop: '5px'
}

const showAllShowLessStyle = {
    padding: 0,
    justifyContent: 'flex-start'
}

const getItemStyle = (isDragging, draggableStyle) => {
    const draggingStyle = {
        background: colors.white,
        ...draggableStyle
    }
    return isDragging ? draggingStyle : draggableStyle;
}

const COLLAPSED_VALUES_LIMIT = 3;

const valueMap = (value, index) =>
    ({ id: index, value: value, originalValue: value });

export default class PropertyMultiField extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            values: [],
            removedValues: [],
            modifiedValues: [],
            isExpanded: false
        }
        this.onDragEnd = this.onDragEnd.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onRemove = this.onRemove.bind(this);
        this.onUndo = this.onUndo.bind(this);
    }

    componentDidMount() {
        this.setState({ values: (this.props.property.value || []).map(valueMap) });
    }

    componentDidUpdate(prevProps) {
        const existingPropertyRefreshed = prevProps.property !== this.props.property && !this.props.isNewProperty;
        const propertyChangesReverted = (prevProps.removed !== this.props.removed || prevProps.modified !== this.props.modified) && !this.props.removed && !this.props.modified;
        const propertyRemoved = (prevProps.removed !== this.props.removed) && this.props.removed;

        if (existingPropertyRefreshed) {
            this.setState({ values: (this.props.property.value || []).map(valueMap) });
        } else if (propertyChangesReverted) {
            this.setState({
                removedValues: [],
                modifiedValues: [],
                values: (this.props.property.value || []).map(valueMap)
            });
        } else if (propertyRemoved) {
            this.setState(({ values }) => ({ removedValues: values.map(({ id }) => id) }));
        }
    }

    reorderValues(values, sourceIndex, destinationIndex) {
        const [removed] = values.splice(sourceIndex, 1);
        values.splice(destinationIndex, 0, removed);
        return values;
    }

    onDragEnd(result) {
        if (result.destination) {
            const { name, type } = this.props.property;
            this.setState((prevState) => {
                return { values: this.reorderValues(prevState.values, result.source.index, result.destination.index) }
            }, () => this.props.onChange(name, type, this.state.values.map(fieldValue => fieldValue.value)));
        }
    }

    onChange(id, type, value) {
        this.setState((prevState) => {

            const modifiedValues = prevState.modifiedValues.filter(modifiedId => modifiedId !== id);
            const changedValue = prevState.values.find(prevValue => prevValue.id === id);
            if (changedValue && changedValue.originalValue !== value) {
                modifiedValues.push(id);
            }

            return {
                values: prevState.values.map((prevValue) => prevValue.id === id ? { ...prevValue, value: value } : prevValue ),
                modifiedValues: modifiedValues
            }
        }, () => {
            if (!this.state.removedValues.length && !this.state.modifiedValues.length) {
                this.props.onUndo(name);
            } else {
                this.props.onChange(this.props.property.name, type, this.state.values.map(prevValue => prevValue.value));
            }
        });
    }

    onRemove(id) {
        const { name, type } = this.props.property;
        this.setState((prevState) => {
            return { removedValues: [...prevState.removedValues, id] }
        }, () => {
            const { values, removedValues } = this.state;
            if (values.length === removedValues.length) {
                this.props.onUndo(name);
                this.props.onRemove(name);
            } else {
                const updateValues = values.filter(prevValue => !removedValues.includes(prevValue.id))
                    .map(prevValue => prevValue.value);
                this.props.onChange(name, type, updateValues);
            }
        })
    }

    onUndo(id) {
        this.setState((prevState) => {
            const changedValue = prevState.values.find(prevValue => prevValue.id === id)
            return {
                removedValues: prevState.removedValues.filter(removedId => removedId !== id),
                modifiedValues: prevState.modifiedValues.filter(modifiedId => modifiedId !== id),
                values: changedValue.isNewValue ?
                    prevState.values.filter(value => value.id !== id)
                    :
                    prevState.values.map(value => value.id === id ? { ...value, value: value.originalValue } : value)
            }
        }, () => {
            const { name, type } = this.props.property;
            const { values, removedValues } = this.state;

            if (!this.state.removedValues.length && !this.state.modifiedValues.length) {
                this.props.onUndo(name);
            } else {
                this.props.onUndo(name);
                const updateValues = values
                    .filter(prevValue => !removedValues.includes(prevValue.id))
                    .map(prevValue => prevValue.value);
                this.props.onChange(name, type, updateValues);
            }
        });
    }

    render() {
        const { resource, changelog, hideActions, onChangelogUpdate, provider, property } = this.props;
        const { isExpanded, values, removedValues, modifiedValues } = this.state;

        const isDraggable = property.modifiable && values.length > 1;

        const hasMore = values.length > COLLAPSED_VALUES_LIMIT;
        const displayedValues = isExpanded || !hasMore ? values : values.slice(0, COLLAPSED_VALUES_LIMIT);

        return (
            <>
                <DragDropContext onDragEnd={this.onDragEnd}>
                    <Droppable droppableId='droppable'>
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {displayedValues.map((value, index) => (
                                    <Draggable
                                        key={'draggable' + value.id}
                                        draggableId={'draggable' + value.id}
                                        index={index}
                                        isDragDisabled={!isDraggable}
                                    >
                                        {(draggableProvided, snapshot) => (
                                            <div
                                                ref={draggableProvided.innerRef}
                                                {...draggableProvided.draggableProps}
                                                {...draggableProvided.dragHandleProps}
                                                style={getItemStyle(snapshot.isDragging, draggableProvided.draggableProps.style)}
                                            >
                                                <DraggableContainer>
                                                    {isDraggable && <ReorderIcon className='material-icons'>swap_vert</ReorderIcon>}
                                                    <PropertyValueField
                                                        key={index}
                                                        changelog={changelog}
                                                        hideActions={hideActions}
                                                        isMultiField={true}
                                                        onChange={this.onChange}
                                                        onChangelogUpdate={onChangelogUpdate}
                                                        onRemove={this.onRemove}
                                                        onUndo={this.onUndo}
                                                        provider={provider}
                                                        resource={resource}
                                                        removed={removedValues.includes(value.id)}
                                                        modified={modifiedValues.includes(value.id)}
                                                        property={{ ...property, name: value.id, value: value.value }} />
                                                </DraggableContainer>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
                {(hasMore || property.modifiable) && (
                    <ActionBar style={{ paddingBottom: values.length ? '8px' : 0 }}>
                        {hasMore && (
                            <Button
                                appearance="subtle-link"
                                style={showAllShowLessStyle}
                                onClick={() => {
                                    this.setState((prevState) => {
                                        return { isExpanded: !prevState.isExpanded };
                                    })
                                }}>
                                {isExpanded ? 'Show less' : 'Show all'}
                            </Button>
                        )}
                        {property.modifiable && (
                            <Button
                                spacing='compact'
                                style={values.length ? {} : valueButtonStyle}
                                onClick={() => {
                                    this.setState((prevState) => {
                                        const nextId = (prevState.values.map(value => value.id).pop() + 1) || 0;
                                        return {
                                            isExpanded: true,
                                            values: [...prevState.values, { id: nextId, value: '', isNewValue: true }],
                                            modifiedValues: [...prevState.modifiedValues, nextId]
                                        }
                                    })
                                }}>
                                Add value
                            </Button>
                        )}
                    </ActionBar>
                )}
            </>
        )
    }

}
