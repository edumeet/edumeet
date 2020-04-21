# Disables debug package
%global debug_package %{nil}

%global __brp_mangle_shebangs /bin/true

%define commit          effdd3005b9641d1d503d70af064eab0a9c550a8
%define shortcommit     %(c=%{commit}; echo ${c:0:7})
%define _date           %(date +'%%Y%%m%%dT%%H%%M%%S')
%define _release        1

Name:                   multiparty-meeting
Version:                3.2.1
License:                MIT
Summary:                Multiparty web-meetings using mediasoup and WebRTC
URL:                    https://github.com/havfo/multiparty-meeting
%if 0%{?commit:1}
Release:	        %{_release}.git%{shortcommit}.%{_date}%{?dist}
Source0:                %{url}/archive/%{commit}.tar.gz
%else
Release:                %{_release}%{?dist}
Source0:                %{url}/archive/%{version}.tar.gz
%endif
Source1: 		%{name}.service
Source2: 		%{name}.sysconfig

ExclusiveArch:          %{nodejs_arches} noarch

BuildRequires:		systemd
BuildRequires:          nodejs-packaging
BuildRequires:          nodejs >= 10
BuildRequires:          npm
BuildRequires:          yarn
BuildRequires:          python3-devel
BuildRequires:          openssl-devel
BuildRequires:		redis-devel
Requires:               nodejs >= 10
Requires: 		redis

Requires(post):         policycoreutils
Requires(post):         policycoreutils-python-utils
Requires(postun):       policycoreutils

%global appdir		/opt/%{name}

%description
%summary

%prep
%if 0%{?commit:1}
%autosetup -p1 -n %{name}-%{commit}
cd ..
# Rename the directory to just the name, adding the commit hash makes make error out due
# to too long path names.
mv "%{name}-%{commit}" ./"%{name}"
ln -snf %{name} %{name}-%{commit}
%else
%autosetup -p1 -n %{name}-%{version}
%endif

%build
export CXXFLAGS="%{optflags}"
export PYTHON=%{__python3}
export PYTHON3=%{__python3}
export NODE_ENV=production

cd app
npm install
npm install classnames
npm run build
cd -
mkdir -p server/public
cd server
npm install
cd -

rm -rf server/node_modules/clang-tools-prebuilt

find server/node_modules/mediasoup \
\( \
  -name samples -or \
  -name src -or \
  -name test -or \
  -name deps -or \
  -name '*.a' -or \
  -name .deps -or \
  -name include -or \
  -name obj.target  \
\) -a -print0 \
| xargs -0 rm -rf

for i in $(find -iname '*.py')
do
  sed -i -r \
        -e 's:(/usr)?/bin/(env )?python([0-9]+([.][0-9]+)?)?:%{__python3}:g' \
  ${i}
done

%install
install -d %{buildroot}%{appdir}
install -d %{buildroot}%{_docdir}/%{name}
install -d %{buildroot}%{_sysconfdir}/%{name}

install -Dpm 0644 %{SOURCE1} %{buildroot}%{_unitdir}/%{name}.service
install -Dpm 0644 %{SOURCE2} %{buildroot}%{_sysconfdir}/sysconfig/%{name}

cp -R . %{buildroot}%{appdir}/
cp -R LTI munin %{buildroot}%{_docdir}/%{name}
rm -f \
  %{buildroot}%{appdir}%{name}.service \
  %{buildroot}%{appdir}/*.md \
  %{buildroot}%{appdir}/.gitignore
rm -rf \
  %{buildroot}%{appdir}/app \
  %{buildroot}%{appdir}/LTI \
  %{buildroot}%{appdir}/munin
mv %{buildroot}%{appdir}/server/config/config.example.js %{buildroot}%{_sysconfdir}/%{name}/config.js
mv %{buildroot}%{appdir}/server/public/config/config.example.js %{buildroot}%{_sysconfdir}/%{name}/app-config.js
ln -snf %{_sysconfdir}/%{name}/config.js %{buildroot}%{appdir}/server/config/config.js
ln -snf %{_sysconfdir}/%{name}/app-config.js %{buildroot}%{appdir}/server/public/config/config.js

%pre
getent group mm > /dev/null || groupadd -r mm
getent passwd mm > /dev/null || \
    useradd -r -d %{_sharedstatedir}/mm -g mm \
    -s /sbin/nologin -c "%{name} service user" mm
exit 0

%post
%systemd_post %{name}.service

%preun
%systemd_preun %{name}.service

%postun
%systemd_postun_with_restart %{name}.service

%files
%doc CHANGELOG.md README.md HAproxy.md server/config/config.example.js
%{appdir}
%config(noreplace) %{_sysconfdir}/sysconfig/%{name}
%config(noreplace) %{_sysconfdir}/%{name}/config.js
%config(noreplace) %{_sysconfdir}/%{name}/app-config.js
%{_unitdir}/%{name}.service
%{_docdir}/%{name}/LTI
%{_docdir}/%{name}/munin

%changelog
* Mon Apr 20 2020 fuero - 3.2.1-1
- initial package
