create table author_local
(
    id                integer not null
        constraint author_local_pk
            primary key autoincrement,
    local_author_name text
);

create table author_site
(
    id               integer not null
        constraint author_site_pk
            primary key autoincrement,
    site_id          integer,
    site_author_id   text,
    site_author_name text,
    introduce        text,
    local_author_id  integer
);

create table poi
(
    id       integer not null
        constraint poi_pk
            primary key autoincrement,
    poi_name text
);

create table poi_target
(
    id          integer not null
        constraint poi_target_pk
            primary key autoincrement,
    poi_id      integer,
    target_id   integer,
    target_type text
);

create table site
(
    id            integer not null
        constraint site_pk
            primary key autoincrement,
    site_name     text,
    site_domain   text,
    site_homepage text
);

create table tag_local
(
    id                integer not null
        constraint tag_local_pk
            primary key autoincrement,
    local_tag_name    text,
    base_local_tag_id integer
);

create table tag_site
(
    id               integer not null
        constraint tag_site_pk
            primary key autoincrement,
    site_id          integer,
    site_tag_id      text,
    site_tag_name    text,
    base_site_tag_id text,
    description      text,
    local_tag_id     integer
);

create table task
(
    id          integer not null
        constraint task_pk
            primary key autoincrement,
    site_id     integer,
    works_id    integer,
    url         text,
    create_time text,
    status      smallint
);

create table works
(
    id               integer not null
        constraint works_pk
            primary key autoincrement,
    file_path        text,
    site_id          integer,
    site_works_id    text,
    site_works_name  text,
    site_author_id   text,
    site_upload_time text,
    nick_name        text,
    local_author     integer,
    download_time    integer,
    download_status  smallint,
    download_task_id integer
);

create table works_tag
(
    id          integer not null
        constraint works_tag_pk
            primary key autoincrement,
    works_id    integer,
    tag_id      text,
    tag_type    boolean,
    tag_site_id integer,
    create_time text
);