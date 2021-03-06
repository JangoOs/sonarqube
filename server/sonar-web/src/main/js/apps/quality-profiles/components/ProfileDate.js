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
import moment from 'moment';
import shallowCompare from 'react-addons-shallow-compare';
import { translate } from '../../../helpers/l10n';

export default class ProfileDate extends React.Component {
  static propTypes = {
    date: React.PropTypes.string
  };

  shouldComponentUpdate (nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  render () {
    const { date } = this.props;

    if (!date) {
      return (
          <span className="text-muted">{translate('never')}</span>
      );
    }

    return (
        <span title={moment(date).format('LLL')} data-toggle="tooltip">
          {moment(date).fromNow()}
        </span>
    );
  }
}
