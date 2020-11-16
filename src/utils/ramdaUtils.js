import { equals, uniqWith, omit, concat, differenceWith } from 'ramda'

export const omitDocProps = omit(['_id', '_rev', '_deleted', 'madeBy'])
export const equalsOmittingDocProps = (curr, old) =>
  equals(omitDocProps(curr), omitDocProps(old))
export const uniqOmittingDocProps = uniqWith(equalsOmittingDocProps)
export const getDeletedItems = (curr, old) =>
  differenceWith(equalsOmittingDocProps, old, curr)
export const getInsertedItems = differenceWith(equalsOmittingDocProps)
export const getDiff = (curr, old) =>
  concat(
    getInsertedItems(curr, old),
    getDeletedItems(curr, old).map(x => ({
      ...x,
      _deleted: true
    }))
  )
