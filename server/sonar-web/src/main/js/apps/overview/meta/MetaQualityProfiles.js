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
import { TooltipsContainer } from '../../../components/mixins/tooltips-mixin';
import { translate, translateWithParameters } from '../../../helpers/l10n';
import { getQualityProfileUrl } from '../../../helpers/urls';
import { searchRules } from '../../../api/rules';
import { getRulesUrl } from '../../../helpers/urls';

export default class MetaQualityProfiles extends React.Component {
  state = {
    deprecatedByKey: {}
  };

  componentDidMount () {
    this.mounted = true;
    this.loadDeprecatedRules();
  }

  componentWillUnmount () {
    this.mounted = false;
  }

  loadDeprecatedRules () {
    const requests = this.props.profiles.map(profile => (
        this.loadDeprecatedRulesForProfile(profile.key)
    ));
    Promise.all(requests).then(responses => {
      if (this.mounted) {
        const deprecatedByKey = {};
        responses.forEach((count, i) => {
          const profileKey = this.props.profiles[i].key;
          deprecatedByKey[profileKey] = count;
        });
        this.setState({ deprecatedByKey });
      }
    });
  }

  loadDeprecatedRulesForProfile (profileKey) {
    const data = {
      qprofile: profileKey,
      activation: 'true',
      statuses: 'DEPRECATED',
      ps: 1
    };
    return searchRules(data).then(r => r.total);
  }

  renderDeprecated (profile) {
    const count = this.state.deprecatedByKey[profile.key];
    if (!count) {
      return null;
    }

    const url = getRulesUrl({
      qprofile: profile.key,
      activation: 'true',
      statuses: 'DEPRECATED'
    });

    return (
        <a className="icon-alert-warn spacer-right"
           href={url}
           title={translateWithParameters('overview.deprecated_profile', count)}
           data-toggle="tooltip"/>
    );
  }

  render () {
    const { profiles } = this.props;

    return (
        <TooltipsContainer>
          <div>
            <h4 className="overview-meta-header">
              {translate('overview.quality_profiles')}
            </h4>

            <ul className="overview-meta-list">
              {profiles.map(profile => (
                  <li key={profile.key}>
                    {this.renderDeprecated(profile)}
                    <span className="note spacer-right">
                      {'(' + profile.language + ')'}
                    </span>
                    <a href={getQualityProfileUrl(profile.key)}>
                      {profile.name}
                    </a>
                  </li>
              ))}
            </ul>
          </div>
        </TooltipsContainer>
    );
  }
}
