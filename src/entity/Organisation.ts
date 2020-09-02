import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinTable,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
} from 'typeorm'
import { Contact } from './Contact'
import { ProgramArea } from './ProgramArea'
import { Grant } from './Grant'

@Entity()
export class Organisation {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ nullable: true })
  abbreviation: string

  @Column({ nullable: true })
  website: string

  @Column({ nullable: true })
  notes: string

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date

  @ManyToMany((type) => Contact, (contact) => contact.organisations)
  contacts: Contact[]

  @ManyToMany((type) => ProgramArea, (program) => program.organisations)
  @JoinTable()
  programs: ProgramArea[]

  @OneToMany((type) => Grant, (grant) => grant.organisation)
  grants: Grant[]
}
