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
package org.sonar.server.permission.ws;

import com.google.common.collect.Multimap;
import com.google.common.collect.Ordering;
import com.google.common.collect.TreeMultimap;
import java.util.List;
import java.util.stream.Collectors;
import org.sonar.api.server.ws.Request;
import org.sonar.api.server.ws.Response;
import org.sonar.api.server.ws.WebService;
import org.sonar.api.server.ws.WebService.Param;
import org.sonar.api.utils.Paging;
import org.sonar.db.DbClient;
import org.sonar.db.DbSession;
import org.sonar.db.permission.PermissionTemplateQuery;
import org.sonar.db.permission.template.PermissionTemplateDto;
import org.sonar.db.permission.template.PermissionTemplateUserDto;
import org.sonar.db.user.UserDto;
import org.sonar.server.user.UserSession;
import org.sonarqube.ws.WsPermissions;
import org.sonarqube.ws.WsPermissions.UsersWsResponse;

import static org.sonar.api.server.ws.WebService.Param.PAGE;
import static org.sonar.api.server.ws.WebService.Param.PAGE_SIZE;
import static org.sonar.api.server.ws.WebService.Param.TEXT_QUERY;
import static org.sonar.db.permission.PermissionQuery.DEFAULT_PAGE_SIZE;
import static org.sonar.db.permission.PermissionQuery.RESULTS_MAX_SIZE;
import static org.sonar.db.permission.PermissionQuery.SEARCH_QUERY_MIN_LENGTH;
import static org.sonar.server.permission.PermissionPrivilegeChecker.checkGlobalAdminUser;
import static org.sonar.server.permission.ws.PermissionRequestValidator.validateProjectPermission;
import static org.sonar.server.permission.ws.PermissionsWsParametersBuilder.createProjectPermissionParameter;
import static org.sonar.server.permission.ws.PermissionsWsParametersBuilder.createTemplateParameters;
import static org.sonar.server.ws.WsUtils.writeProtobuf;
import static org.sonarqube.ws.client.permission.PermissionsWsParameters.PARAM_PERMISSION;

public class TemplateUsersAction implements PermissionsWsAction {

  private final DbClient dbClient;
  private final UserSession userSession;
  private final PermissionDependenciesFinder dependenciesFinder;

  public TemplateUsersAction(DbClient dbClient, UserSession userSession, PermissionDependenciesFinder dependenciesFinder) {
    this.dbClient = dbClient;
    this.userSession = userSession;
    this.dependenciesFinder = dependenciesFinder;
  }

  @Override
  public void define(WebService.NewController context) {
    WebService.NewAction action = context
      .createAction("template_users")
      .setSince("5.2")
      .setDescription("Lists the users with their permission as individual users rather than through group affiliation on the chosen template. <br />" +
        "This service defaults to global permissions, but can be limited to project permissions by providing project id or project key.<br> " +
        "This service defaults to all users, but can be limited to users with a specific permission by providing the desired permission.<br>" +
        "It requires administration permissions to access.<br />")
      .addPagingParams(DEFAULT_PAGE_SIZE, RESULTS_MAX_SIZE)
      .setInternal(true)
      .setResponseExample(getClass().getResource("template_users-example.json"))
      .setHandler(this);

    action.createParam(Param.TEXT_QUERY)
      .setDescription("Limit search to user names that contain the supplied string. Must have at least %d characters.<br/>" +
        "When this parameter is not set, only users having at least one permission are returned.", SEARCH_QUERY_MIN_LENGTH)
      .setExampleValue("eri");
    createProjectPermissionParameter(action).setRequired(false);
    createTemplateParameters(action);
  }

  @Override
  public void handle(Request wsRequest, Response wsResponse) throws Exception {
    checkGlobalAdminUser(userSession);
    DbSession dbSession = dbClient.openSession(false);
    try {
      WsTemplateRef templateRef = WsTemplateRef.fromRequest(wsRequest);
      PermissionTemplateDto template = dependenciesFinder.getTemplate(dbSession, templateRef);

      PermissionTemplateQuery query = buildQuery(wsRequest, template);
      int total = dbClient.permissionTemplateDao().countUsersByQuery(dbSession, query, template.getId());
      Paging paging = Paging.forPageIndex(wsRequest.mandatoryParamAsInt(PAGE)).withPageSize(wsRequest.mandatoryParamAsInt(PAGE_SIZE)).andTotal(total);
      List<UserDto> users = findUsers(dbSession, query, template);
      List<PermissionTemplateUserDto> permissionTemplateUsers = dbClient.permissionTemplateDao().selectUserPermissionsByLogins(dbSession,
        users.stream().map(UserDto::getLogin).collect(Collectors.toList()));
      WsPermissions.UsersWsResponse templateUsersResponse = buildResponse(users, permissionTemplateUsers, paging);
      writeProtobuf(templateUsersResponse, wsRequest, wsResponse);
    } finally {
      dbClient.closeSession(dbSession);
    }
  }

  private static PermissionTemplateQuery buildQuery(Request wsRequest, PermissionTemplateDto template) {
    String textQuery = wsRequest.param(TEXT_QUERY);
    String permission = wsRequest.param(PARAM_PERMISSION);
    PermissionTemplateQuery.Builder query = PermissionTemplateQuery.builder()
      .setTemplate(template.getUuid())
      .setPermission(permission != null ? validateProjectPermission(permission) : null)
      .setPageIndex(wsRequest.mandatoryParamAsInt(PAGE))
      .setPageSize(wsRequest.mandatoryParamAsInt(PAGE_SIZE))
      .setSearchQuery(textQuery);
    if (textQuery == null) {
      query.withPermissionOnly();
    }
    return query.build();
  }

  private WsPermissions.UsersWsResponse buildResponse(List<UserDto> users, List<PermissionTemplateUserDto> permissionTemplateUsers, Paging paging) {
    Multimap<Long, String> permissionsByUserId = TreeMultimap.create();
    permissionTemplateUsers.forEach(userPermission -> permissionsByUserId.put(userPermission.getUserId(), userPermission.getPermission()));

    UsersWsResponse.Builder responseBuilder = UsersWsResponse.newBuilder();
    users.forEach(user -> {
      WsPermissions.User.Builder userResponse = responseBuilder.addUsersBuilder()
        .setLogin(user.getLogin())
        .addAllPermissions(permissionsByUserId.get(user.getId()));
      if (user.getEmail() != null) {
        userResponse.setEmail(user.getEmail());
      }
      if (user.getName() != null) {
        userResponse.setName(user.getName());
      }
    });
    responseBuilder.getPagingBuilder()
      .setPageIndex(paging.pageIndex())
      .setPageSize(paging.pageSize())
      .setTotal(paging.total())
      .build();
    return responseBuilder.build();
  }

  public List<UserDto> findUsers(DbSession dbSession, PermissionTemplateQuery query, PermissionTemplateDto template) {
    List<String> orderedLogins = dbClient.permissionTemplateDao().selectLoginsByPermissionQuery(dbSession, query, template.getId());
    return Ordering.explicit(orderedLogins).onResultOf(UserDto::getLogin).immutableSortedCopy(dbClient.userDao().selectByLogins(dbSession, orderedLogins));
  }

}
