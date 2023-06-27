import { inject } from "@angular/core";
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ApiService } from "@users/core/http";
import { authActions } from "./auth.actions";
import { catchError, concatMap, map, of, switchMap, tap } from "rxjs";
import { NewUser, RegisterResponse, SignAuthPayload, SignAuthResponse } from "./sign.auth.model";
import { LocalStorageJwtService } from "../services/local-storage-jwt.service";
import { Router } from "@angular/router";
import { UsersDTO } from "@users/users/data-access";
import { usersDTOAdapter } from "libs/users/users/data-access/src/lib/users-dto.adapter";

export const loginEffect$ = createEffect(
  (api = inject(ApiService), actions$ = inject(Actions)) => actions$.pipe(
    ofType(authActions.login),
    switchMap(
      ({ userData }) =>
        api.post<SignAuthResponse, SignAuthPayload>('/auth/login', userData)
          .pipe(
            map((res) => {
              const userEntity = usersDTOAdapter.DTOtoEntity(res.user);
              const updatedRes = { ...res, user: userEntity };
              return authActions.loginSuccess({ res: updatedRes });
            }),
            catchError(error => of(authActions.loginFailure({ error })))
          )
    )
  ), { functional: true }
)

export const loginSuccessEffect$ = createEffect(
  (actions$ = inject(Actions),
    localStorageJwtService = inject(LocalStorageJwtService),
    router = inject(Router)) => {
    return actions$.pipe(
      ofType(authActions.loginSuccess),
      tap((action) => {
        localStorageJwtService.setItem(action.res.authToken);
        router.navigateByUrl('/home')
      })
    )
  }, { functional: true, dispatch: false },
)

export const getUserEffect$ = createEffect(
  (actions$ = inject(Actions), api = inject(ApiService)) => {
    return actions$.pipe(
      ofType(authActions.getUser),
      switchMap(
        () =>
          api.get<UsersDTO>('/auth/me').pipe(
            map((userDTO) => {
              const userEntity = usersDTOAdapter.DTOtoEntity(userDTO);
              return authActions.getUserSuccess({ user: userEntity });
            }),
            catchError((error) => of(authActions.getUserFailure({ error }))),
          ),
      ),
    );
  },
  { functional: true }
)

export const registerEffect$ = createEffect(
  (actions$ = inject(Actions), api = inject(ApiService)) => {
    return actions$.pipe(
      ofType(authActions.register),
      switchMap(
        ({ userData }) => api.post<RegisterResponse, NewUser>('/auth/signup', userData).pipe(
          map(({ authToken }) => authActions.registerSuccess({ authToken })),
          catchError((error) => of(authActions.loginFailure({ error })))
        )
      )
    )
  }, { functional: true }
);

export const registerSuccessEffects$ = createEffect(
  (actions$ = inject(Actions),
    localStorageJwtService = inject(LocalStorageJwtService),
    router = inject(Router)) => {
    return actions$.pipe(
      ofType(authActions.registerSuccess),
      concatMap((action) => {
        localStorageJwtService.setItem(action.authToken);
        router.navigateByUrl('/home');
        return of(authActions.getUser());
      })
    );
  },
  { functional: true }
);

export const logoutEffect$ = createEffect(
  ((actions$ = inject(Actions),
    jwtService = inject(LocalStorageJwtService),
    router = inject(Router)) => actions$.pipe(
      ofType(authActions.logout),
      tap(_ => {
        jwtService.removeItem();
        router.navigate(['/login'])
      })
    )
  ), { functional: true, dispatch: false }
)