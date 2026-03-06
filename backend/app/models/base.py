from sqlalchemy import BigInteger
from sqlalchemy.orm import DeclarativeBase

BigInt = BigInteger


class Base(DeclarativeBase):
    pass
