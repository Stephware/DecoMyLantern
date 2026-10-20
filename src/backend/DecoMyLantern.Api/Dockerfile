FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY DecoMyLantern.Api.csproj ./
RUN dotnet restore DecoMyLantern.Api.csproj
COPY . ./
RUN dotnet publish DecoMyLantern.Api.csproj --no-restore -c Release -o /app/publish -p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "DecoMyLantern.Api.dll"]
