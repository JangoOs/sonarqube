/*
 * SonarQube
 * Copyright (C) 2009-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import React from 'react';
import difference from 'lodash/difference';
import { PermissionTemplateType, CallbackType } from '../propTypes';
import QualifierIcon from '../../../components/shared/qualifier-icon';
import { translate } from '../../../helpers/l10n';
import { setDefaultPermissionTemplate } from '../../../api/permissions';

export default class ActionsCell extends React.Component {
  static propTypes = {
    permissionTemplate: PermissionTemplateType.isRequired,
    topQualifiers: React.PropTypes.array.isRequired,
    onUpdate: CallbackType,
    onDelete: CallbackType,
    refresh: CallbackType
  };

  handleUpdateClick (e) {
    e.preventDefault();
    this.props.onUpdate();
  }

  handleDeleteClick (e) {
    e.preventDefault();
    this.props.onDelete();
  }

  setDefault (qualifier, e) {
    e.preventDefault();
    setDefaultPermissionTemplate(
        this.props.permissionTemplate.name,
        qualifier
    ).then(this.props.refresh);
  }

  getAvailableQualifiers () {
    return difference(
        this.props.topQualifiers,
        this.props.permissionTemplate.defaultFor);
  }

  renderDropdownIcon (icon) {
    const style = {
      display: 'inline-block',
      width: 16,
      marginRight: 4,
      textAlign: 'center'
    };
    return (
        <div style={style}>{icon}</div>
    );
  }

  renderSetDefaultsControl () {
    const availableQualifiers = this.getAvailableQualifiers();

    if (availableQualifiers.length === 0) {
      return null;
    }

    return this.props.topQualifiers.length === 1 ?
        this.renderIfSingleTopQualifier(availableQualifiers) :
        this.renderIfMultipleTopQualifiers(availableQualifiers);
  }

  renderSetDefaultLink (qualifier, child) {
    return (
        <li key={qualifier}>
          <a href="#"
             className="js-set-default"
             data-qualifier={qualifier}
             onClick={this.setDefault.bind(this, qualifier)}>
            {this.renderDropdownIcon(<i className="icon-check"/>)}
            {child}
          </a>
        </li>
    );
  }

  renderIfSingleTopQualifier (availableQualifiers) {
    return availableQualifiers.map(qualifier => (
        this.renderSetDefaultLink(qualifier, (
            <span>{translate('permission_templates.set_default')}</span>
        )))
    );
  }

  renderIfMultipleTopQualifiers (availableQualifiers) {
    return availableQualifiers.map(qualifier => (
        this.renderSetDefaultLink(qualifier, (
            <span>
              {translate('permission_templates.set_default_for')}
              {' '}
              <QualifierIcon qualifier={qualifier}/>
              {' '}
              {translate('qualifiers', qualifier)}
            </span>
        )))
    );
  }

  render () {
    const { permissionTemplate: t } = this.props;

    return (
        <td className="actions-column">
          <div className="dropdown">
            <button className="dropdown-toggle" data-toggle="dropdown">
              {translate('actions')}
              {' '}
              <i className="icon-dropdown"></i>
            </button>

            <ul className="dropdown-menu dropdown-menu-right">
              {this.renderSetDefaultsControl()}

              <li>
                <a href="#"
                   className="js-update"
                   onClick={this.handleUpdateClick.bind(this)}>
                  {this.renderDropdownIcon(<i className="icon-edit"/>)}
                  {translate('update_verb')}
                </a>
              </li>

              {t.defaultFor.length === 0 && (
                  <li>
                    <a href="#"
                       className="js-delete"
                       onClick={this.handleDeleteClick.bind(this)}>
                      {this.renderDropdownIcon(<i className="icon-delete"/>)}
                      {translate('delete')}
                    </a>
                  </li>
              )}
            </ul>
          </div>
        </td>
    );
  }
}
