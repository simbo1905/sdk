import * as ffi from 'ffi'
import { VCXInternalError } from '../errors'
import { rustAPI } from '../rustlib'
import { errorMessage } from '../utils/error-message'
import { createFFICallbackPromise } from '../utils/ffi-helpers'
import { VCXBase } from './vcx-base'

/**
 * @interface
 * @description
 * SourceId: String for SDK User's reference.
 * name: name of credentialdef.
 * schemaNo: Schema Number wanted to create credentialdef off of
 * revocation:
 */
export interface ICredentialDefCreateData {
  sourceId: string,
  name: string,
  schemaId: string,
  revocation: boolean,
  paymentHandle: number
}

export interface ICredentialDefData {
  source_id: string,
  handle: number
  name: string
  credential_def: ICredentialDefDataObj
}

export interface ICredentialDefDataObj {
  ref: number,
  origin: string,
  signature_type: string,
  data: any,
}

export interface ICredentialDefParams {
  schemaId: string,
  name: string,
}

/**
 * @class Class representing a credential Definition
 */
export class CredentialDef extends VCXBase<ICredentialDefData> {
  /**
   * @memberof CredentialDef
   * @description creates a credential definition on the ledger and returns an associated object.
   * @static
   * @async
   * @function create
   * @param {ICredentialDefCreateData} data
   * @example <caption>Example of ICredentialDefinition</caption>
   * {
   *    sourceId: "12",
   *    schemaId: "2hoqvcwupRTUNkXn6ArYzs:2:test-licence:4.4.4",
   *    name: "test-licence",
   *    revocation: false,
   *    paymentHandle: 0
   * }
   * @returns {Promise<credentialDef>} A credentialDef Object
   */
  public static async create ({
    name,
    paymentHandle,
    schemaId,
    sourceId
  }: ICredentialDefCreateData): Promise<CredentialDef> {
    // Todo: need to add params for tag and config
    const credentialDef = new CredentialDef(sourceId, { name, schemaId })
    const commandHandle = 0
    const issuerDid = null
    try {
      await credentialDef._create((cb) => rustAPI().vcx_credentialdef_create(
      commandHandle,
      sourceId,
      name,
      schemaId,
      issuerDid,
      'tag1',
      '{"support_revocation":false}',
      paymentHandle,
      cb
      ))
      return credentialDef
    } catch (err) {
      throw new VCXInternalError(err, errorMessage(err), 'vcx_credentialdef_create')
    }
  }

  /**
   * @memberof CredentialDef
   * @description Builds a credentialDef object with defined attributes.
   * Attributes are provided by a previous call to the serialize function.
   * @static
   * @async
   * @function deserialize
   * @param {ICredentialDefData} data - data obtained by serialize api. Used to build a credentialdef object.
   * @returns {Promise<credentialDef>} A credentialDef Object
   */
  public static async deserialize (data: ICredentialDefData) {
    // Todo: update the ICredentialDefObj
    const credentialDefParams = {
      name: data.name,
      schemaId: null
    }
    return super._deserialize(CredentialDef, data, credentialDefParams)
  }

  protected _releaseFn = rustAPI().vcx_credentialdef_release
  protected _serializeFn = rustAPI().vcx_credentialdef_serialize
  protected _deserializeFn = rustAPI().vcx_credentialdef_deserialize
  private _name: string
  private _schemaId: string
  private _credDefId: string | null

  constructor (sourceId: string, { name, schemaId }: ICredentialDefParams) {
    super(sourceId)
    this._name = name
    this._schemaId = schemaId
    this._credDefId = null
  }

  /**
   * @memberof CredentialDef
   * @description Retrieves the credential definition id associated with the created cred def.
   * @async
   * @function getCredDefId
   * @returns {Promise<string>} - CredDef's Identifier
   */
  public async getCredDefId (): Promise<string> {
    try {
      const credDefId = await createFFICallbackPromise<string>(
          (resolve, reject, cb) => {
            const rc = rustAPI().vcx_credentialdef_get_cred_def_id(0, this.handle, cb)
            if (rc) {
              reject(rc)
            }
          },
          (resolve, reject) => ffi.Callback(
            'void',
            ['uint32', 'uint32', 'string'],
            (xcommandHandle: number, err: number, credDefIdVal: string) => {
              if (err) {
                reject(err)
                return
              }
              this._credDefId = credDefIdVal
              resolve(credDefIdVal)
            })
        )
      return credDefId
    } catch (err) {
      throw new VCXInternalError(err, errorMessage(err), 'vcx_credentialdef_get_cred_def_id')
    }
  }

  public async getPaymentTxn (): Promise<string> {
    try {
      return await createFFICallbackPromise<string>(
          (resolve, reject, cb) => {
            const rc = rustAPI().vcx_credentialdef_get_payment_txn(0, this.handle, cb)
            if (rc) {
              reject(rc)
            }
          },
          (resolve, reject) => ffi.Callback('void', ['uint32', 'uint32', 'string'],
          (xcommandHandle: number, err: number, info: any) => {
            if (err) {
              reject(err)
              return
            }
            resolve(info)
          })
        )
    } catch (err) {
      throw new VCXInternalError(err, errorMessage(err), `vcx_credential_get_payment_info`)
    }
  }

  get name () {
    return this._name
  }

  get schemaId () {
    return this._schemaId
  }

  get credDefId () {
    return this._credDefId
  }
}